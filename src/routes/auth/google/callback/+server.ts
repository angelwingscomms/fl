import { google_client } from '$lib/server/oauth';
import { encode_session } from '$lib/server/session';
import { create_user, get_user_by_email } from '$lib/server/user';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent): Promise<Response> {
	const genv = { GOOGLE_ID: env.GOOGLE_ID, GOOGLE_SECRET: env.GOOGLE_SECRET };
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const stored_state = event.cookies.get('oauth_state') ?? null;
	const stored_verifier = event.cookies.get('oauth_verifier') ?? null;
	if (!code || !state || !stored_state || !stored_verifier || state !== stored_state)
		return new Response(null, { status: 400 });
	let tokens: { accessToken(): string };
	try {
		tokens = await (
			await google_client(event.url.origin, genv)
		).validateAuthorizationCode(code, stored_verifier);
	} catch {
		return new Response(null, { status: 400 });
	}
	const ures = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
		headers: { Authorization: `Bearer ${tokens.accessToken()}` }
	});
	if (!ures.ok) return new Response(null, { status: 400 });
	const guser = (await ures.json()) as { sub: string; name: string; email?: string };
	if (!guser.email) return new Response(null, { status: 400 });
	const existing = await get_user_by_email(guser.email);
	const n = guser.name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	const id = existing
		? existing.id
		: await create_user({ n, m: guser.email, o: 'google', d: Date.now() });
	const session = await encode_session({
		id,
		name: existing?.user.n ?? n,
		email: guser.email
	});
	event.cookies.set('session', session, {
		path: '/',
		httpOnly: true,
		maxAge: 604800,
		sameSite: 'lax'
	});
	event.cookies.delete('oauth_state', { path: '/' });
	event.cookies.delete('oauth_verifier', { path: '/' });
	return new Response(null, { status: 302, headers: { Location: '/' } });
}
