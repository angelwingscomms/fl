import { error } from '@sveltejs/kit';
import { require_uid } from '$lib/server/session';
import { get, search, is_profile } from '$lib/server/qdrant';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const uid = require_uid(e);
	const id = e.params.id;

	let job: { payload: Record<string, unknown>; vector?: number[] } | undefined;
	try {
		const res = await get([id], e, true);
		job = res[0];
	} catch {
		throw error(500, 'failed to load job');
	}
	if (!job) throw error(404, 'job not found');
	if ((job.payload.client_id as string) !== uid)
		throw error(403, 'only the client can view this job');

	// a fresh search is done on every page load
	let matches: { handle: string; id: string; score: number; t: string }[] = [];
	try {
		const pts = await search(job.vector as number[], 50, e);
		matches = pts
			.filter(is_profile)
			.slice(0, 9)
			.map((p) => ({
				handle: String(p.payload.handle ?? ''),
				id: String(p.payload.id ?? ''),
				score: p.score,
				t: String(p.payload.t ?? '').slice(0, 200)
			}));
	} catch {
		// leave empty on search failure
	}

	return {
		job: {
			id,
			title: (job.payload.title as string) ?? '',
			description: (job.payload.description as string) ?? ''
		},
		matches
	};
};
