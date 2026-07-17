import { require_uid } from '$lib/server/session';
import { find, get } from '$lib/server/qdrant';
import type { Point } from '$lib/server/qdrant';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const uid = require_uid(e);
	const [as_from, as_to] = await Promise.all([
		find(
			{
				must: [
					{ key: 's', match: { value: 'm' } },
					{ key: 'f', match: { value: uid } }
				]
			},
			200
		),
		find(
			{
				must: [
					{ key: 's', match: { value: 'm' } },
					{ key: 'o', match: { value: uid } }
				]
			},
			200
		)
	]);
	const by_id = new Map<string, Point>();
	for (const m of [...as_from, ...as_to]) by_id.set(m.id, m);

	const groups = new Map<string, { j: string; p: string; b: string; c: number }>();
	for (const m of by_id.values()) {
		const j = m.payload.j as string;
		const f = m.payload.f as string;
		const o = m.payload.o as string;
		const p = f === uid ? o : f;
		const c = m.payload.c as number;
		const key = `${j}:${p}`;
		const cur = groups.get(key);
		if (!cur || c > cur.c) groups.set(key, { j, p, b: m.payload.b as string, c });
	}

	const rows = [...groups.values()].sort((a, b) => b.c - a.c);
	const job_ids = [...new Set(rows.map((r) => r.j))];
	const peer_ids = [...new Set(rows.map((r) => r.p))];
	const [jobs, peers] = await Promise.all([get(job_ids), get(peer_ids)]);
	const job_map = new Map(jobs.map((j) => [j.id, j.payload]));
	const peer_map = new Map(peers.map((p) => [p.id, p.payload]));

	return {
		rows: rows.map((r) => {
			const job = job_map.get(r.j);
			const peer = peer_map.get(r.p);
			const owner = job?.u as string;
			const fid = owner === uid ? r.p : uid;
			return {
				j: r.j,
				jt: (job?.t as string) ?? '',
				p: r.p,
				pn: (peer?.n as string) ?? '',
				pa: (peer?.a as string) || null,
				b: (r.b ?? '').slice(0, 80),
				c: r.c,
				l: `/jobs/${r.j}/chat/${fid}`
			};
		})
	};
};
