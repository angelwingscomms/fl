import { generateState, generateCodeVerifier, google_client } from '$lib/server/oauth';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent): Promise<Response> {
	const genv = { GOOGLE_ID: env.GOOGLE_ID, GOOGLE_SECRET: env.GOOGLE_SECRET };
	const state = generateState();
	const verifier = generateCodeVerifier();
	const redirect_uri = (await google_client(event.url.origin, genv))
		.createAuthorizationURL(state, verifier, ['openid', 'profile', 'email'])
		.toString();
	event.cookies.set('oauth_state', state, {
		path: '/',
		httpOnly: true,
		maxAge: 600,
		sameSite: 'lax'
	});
	event.cookies.set('oauth_verifier', verifier, {
		path: '/',
		httpOnly: true,
		maxAge: 600,
		sameSite: 'lax'
	});
	return new Response(null, { status: 302, headers: { Location: redirect_uri } });
}
