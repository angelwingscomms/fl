import { error, redirect } from '@sveltejs/kit';
import { require_uid } from '$lib/server/session';
import { get, scroll, upsert, ZERO, is_msg } from '$lib/server/qdrant';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const uid = require_uid(e);
	const id = e.params.id;
	const fid = e.params.fid;

	const jobRes = await get([id]).catch(() => null);
	const job = jobRes?.[0]?.payload;
	if (!job) throw error(404, 'job not found');
	if (String(job.client_id ?? '') !== uid)
		throw error(403, 'only the client can message for this job');

	const freelancer = (await get([fid]).catch(() => []))[0]?.payload;
	if (!freelancer) throw error(404, 'freelancer not found');

	let thread: { from: string; body: string; created_at: number }[] = [];
	try {
		const res = await scroll(200);
		thread = res
			.filter((p) => is_msg(p) && String(p.payload.job_id ?? '') === id)
			.map((p) => ({
				from: String(p.payload.from_id ?? ''),
				body: String(p.payload.body ?? ''),
				created_at: Number(p.payload.created_at ?? 0)
			}))
			.sort((a, b) => a.created_at - b.created_at);
	} catch {
		// leave empty on failure
	}

	return {
		job: { id, title: String(job.title ?? '') },
		freelancer: String(freelancer.handle ?? ''),
		thread,
		wsUrl: process.env.PUBLIC_WS_URL ?? '',
		uid,
		peer: fid
	};
};

export const actions: Actions = {
	default: async (e) => {
		const uid = require_uid(e);
		const id = e.params.id;
		const fid = e.params.fid;

		const f = await e.request.formData();
		const body = String(f.get('body') ?? '').trim();
		if (!body) return { error: 'message required' };

		await upsert([
			{
				id: crypto.randomUUID(),
				vector: ZERO(),
				payload: {
					s: id,
					k: 'msg',
					job_id: id,
					from_id: uid,
					to_id: fid,
					body,
					created_at: Date.now()
				}
			}
		]);
		throw redirect(303, `/jobs/${id}/msg/${fid}`);
	}
};
