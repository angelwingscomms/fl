import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { get_uid } from '$lib/server/session';
import { get, find, upsert, ZERO } from '$lib/server/qdrant';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const uid = get_uid({ locals });
	if (!uid) throw error(401, 'login required');
	const body = (await request.json().catch(() => null)) as { j?: string; o?: string; b?: string };
	const j = body?.j;
	const o = body?.o;
	const b = body?.b;
	if (!j || !o || typeof b !== 'string' || b.length < 1 || b.length > 2000)
		throw error(400, 'invalid message');

	const job = (await get([j]))[0];
	if (!job || job.payload.s !== 'j') throw error(404, 'job not found');
	const owner = job.payload.u as string;
	const ok = uid === owner ? o !== uid : o === owner;
	if (!ok) throw error(403, 'not allowed');

	const c = Date.now();
	await upsert([
		{ id: crypto.randomUUID(), vector: ZERO(), payload: { s: 'm', j, f: uid, o, b, c } }
	]);

	const chat = platform?.env?.CHAT;
	if (chat) {
		const id = chat.idFromName(`${j}__${o}`);
		chat
			.get(id)
			.fetch(`https://internal/broadcast`, {
				method: 'POST',
				body: JSON.stringify({ f: uid, b, c })
			})
			.catch(() => {});
	}

	return json({ ok: true });
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const uid = get_uid({ locals });
	if (!uid) throw error(401, 'login required');
	const j = url.searchParams.get('j');
	const p = url.searchParams.get('p');
	if (!j || !p) throw error(400, 'j and p required');

	const job = (await get([j]))[0];
	if (!job || job.payload.s !== 'j') throw error(404, 'job not found');
	const owner = job.payload.u as string;
	if (uid !== owner && uid !== p) throw error(403, 'not allowed');

	const msgs = await find(
		{
			must: [
				{ key: 's', match: { value: 'm' } },
				{ key: 'j', match: { value: j } }
			]
		},
		200
	);
	const pair = new Set([owner, p]);
	const t = msgs
		.filter((m) => pair.has(m.payload.f as string) && pair.has(m.payload.o as string))
		.map((m) => ({ f: m.payload.f, b: m.payload.b, c: m.payload.c }))
		.sort((a, b) => (a.c as number) - (b.c as number));
	return json({ t });
};
