// OpenRouter embeddings. same model + key as ../ver (qwen/qwen3-embedding-8b).
const MODEL = 'qwen/qwen3-embedding-8b';

export async function embed(text: string, env: { OPENROUTER_KEY?: string }): Promise<number[]> {
	const key = env.OPENROUTER_KEY;
	if (!key) return fallback(text);
	const r = await fetch('https://openrouter.ai/api/v1/embeddings', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ model: MODEL, input: text })
	});
	if (!r.ok) throw new Error(`embed ${r.status} ${await r.text()}`);
	return (await r.json()).data[0].embedding as number[];
}

// local fallback so dev/tests work without a key (consistent dim within one env).
function fallback(text: string): number[] {
	const dim = 512;
	const v = new Array(dim).fill(0);
	for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
		let h = 0;
		for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0;
		v[h % dim] += 1;
	}
	return v;
}
