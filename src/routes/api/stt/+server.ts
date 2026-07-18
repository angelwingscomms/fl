import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Mirrors @renjfk/opencode-voice/lib/stt.js: buildOpenRouterTranscriptionRequest
// + transcribeApi + normalizeTranscription. Key stays server-side.
const STT_MODEL = 'nvidia/parakeet-ctc-1.1b';

const STT_SYSTEM_PROMPT = `You are a speech-to-text normalizer for a coding assistant CLI.

Clean up raw whisper transcription into a clear, well-punctuated prompt. Rules:
- Fix punctuation, capitalization, and grammar
- Remove filler words (um, uh, like, you know, etc.)
- Keep technical terms, file names, and code references exact
- If the user is dictating code, format it appropriately
- Use the session context above to resolve ambiguous references (e.g. "that function", "the file", "it")
- Output ONLY the cleaned text, nothing else
- Do not add any commentary or explanation
- Keep the user's intent and meaning intact

CRITICAL DOMAIN CORRECTIONS - Fix common STT homophone errors in software engineering contexts:
- "locks" -> "logs" (unless explicitly talking about mutexes/concurrency)
- "note" / "no" -> "node"
- "app and" -> "append"
- "sink" -> "sync"
- "a sink" -> "async"
- "doc" / "talker" -> "docker"
- "cash" -> "cache"
- "rap" -> "wrap"
- "Jason" -> "JSON"
- "get" -> "Git"
- "react" -> "React"
- "types creep" / "type script" -> "TypeScript"
- "bite" -> "byte"
- "string" -> "String"
- "int" -> "Int"
- "bullion" -> "boolean"

Rely heavily on context to fix words that sound similar to programming terminology.`;

async function transcribe(key: string, wavB64: string): Promise<string> {
	const r = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${key}`
		},
		body: JSON.stringify({
			model: STT_MODEL,
			input_audio: { data: wavB64, format: 'wav' }
		})
	});
	if (!r.ok) {
		const t = await r.text().catch(() => '');
		let msg = `STT API error ${r.status}`;
		try {
			msg = (JSON.parse(t)?.error?.message as string) || msg;
		} catch {}
		throw error(502, msg);
	}
	const data = (await r.json()) as { text?: string };
	return data.text?.trim() || '';
}

async function normalize(key: string, raw: string, context: string): Promise<string> {
	const sys = `${STT_SYSTEM_PROMPT}${context ? ` The user is currently working on: "${context}"` : ''}`;
	const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${key}`
		},
		body: JSON.stringify({
			model: 'anthropic/claude-3.5-haiku',
			messages: [
				{ role: 'system', content: sys },
				{ role: 'user', content: `Clean up this speech-to-text transcription:\n\n${raw}` }
			]
		})
	});
	if (!r.ok) return raw;
	const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
	return data.choices?.[0]?.message?.content?.trim() || raw;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const key = env.OPENROUTER_KEY ?? platform?.env?.OPENROUTER_KEY;
	if (!key) throw error(503, 'STT not configured');

	const body = (await request.json().catch(() => null)) as {
		audio?: string;
		context?: string;
	};
	if (!body?.audio || typeof body.audio !== 'string') throw error(400, 'no audio');

	const raw = await transcribe(key, body.audio);
	if (!raw) return json({ text: '' });

	const text = await normalize(key, raw, body.context ?? '');
	return json({ text });
};
