import { error } from '@sveltejs/kit';
import { require_uid } from '$lib/server/session';
import { get, find } from '$lib/server/qdrant';
import { get_user } from '$lib/server/user';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const uid = require_uid(e);
	const id = e.params.id;
	const fid = e.params.fid;

	const job = (await get([id]))[0];
	if (!job || job.payload.s !== 'j') throw error(404, 'job not found');
	const owner = job.payload.u as string;
	if (uid !== owner && uid !== fid) throw error(403, 'not allowed');

	const p = uid === owner ? fid : owner;
	const peer = await get_user(p);

	const msgs = await find(
		{
			must: [
				{ key: 's', match: { value: 'm' } },
				{ key: 'j', match: { value: id } }
			]
		},
		200
	);
	const pair = new Set([owner, fid]);
	const t = msgs
		.filter((m) => pair.has(m.payload.f as string) && pair.has(m.payload.o as string))
		.map((m) => ({ f: m.payload.f as string, b: m.payload.b as string, c: m.payload.c as number }))
		.sort((a, b) => a.c - b.c);

	return {
		j: { i: id, t: job.payload.t as string },
		ph: peer?.n ?? '',
		pa: peer?.a ?? null,
		u: uid,
		p,
		t
	};
};
