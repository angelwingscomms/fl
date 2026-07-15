import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { create_pw_user, get_user_by_email } from '$lib/server/user';
import { encode_session } from '$lib/server/session';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => null)) as { e?: string; p?: string };
	const e = body?.e?.trim().toLowerCase();
	const p = body?.p ?? '';
	if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw error(400, 'valid email required');
	if (p.length < 8) throw error(400, 'password must be at least 8 characters');
	if (await get_user_by_email(e)) throw error(400, 'email already registered');
	const id = await create_pw_user(e, p);
	const session = await encode_session({ id, name: e, email: e });
	cookies.set('session', session, { path: '/', httpOnly: true, maxAge: 604800, sameSite: 'lax' });
	return json({ ok: true });
};
