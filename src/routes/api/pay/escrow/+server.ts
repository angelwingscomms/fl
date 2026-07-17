import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { get_uid } from '$lib/server/session';
import { get } from '$lib/server/qdrant';
import { paystack_init } from '$lib/server/paystack';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const uid = get_uid({ locals });
	if (!uid) throw error(401, 'login required');
	const body = (await request.json().catch(() => null)) as { j?: string; k?: number };
	const j = body?.j;
	const k = body?.k;
	if (!j || typeof k !== 'number' || k < 100000) throw error(400, 'invalid escrow request');

	let job;
	try {
		job = (await get([j]))[0];
	} catch {
		throw error(500, 'failed to load job');
	}
	if (!job) throw error(400, 'job not found');
	if (job.payload.u !== uid) throw error(403, 'only the job owner can fund escrow');
	if (job.payload.y !== 'h') throw error(400, 'job is not awaiting escrow');

	try {
		const r = await paystack_init(
			locals.user?.email ?? `${uid}@fl.local`,
			k,
			crypto.randomUUID(),
			`${url.origin}/pay/callback?j=${j}`,
			{ a: 'fl', j, user_id: uid }
		);
		return json({ u: r.authorization_url, c: r.access_code, r: r.reference });
	} catch {
		throw error(500, 'paystack init failed');
	}
};
