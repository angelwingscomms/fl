import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { get_uid } from '$lib/server/session';
import { settle } from '$lib/server/pay';

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = get_uid({ locals });
	if (!uid) throw error(401, 'login required');
	const body = (await request.json().catch(() => null)) as { r?: string };
	const r = body?.r;
	if (!r) throw error(400, 'reference required');
	const y = await settle(r);
	return json({ y });
};
