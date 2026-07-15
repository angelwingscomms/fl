import { Google, generateState, generateCodeVerifier } from 'arctic';
import type { SecretVal } from './qdrant';

export type GoogleEnv = { GOOGLE_ID?: SecretVal; GOOGLE_SECRET?: SecretVal };

export async function get_secret(v: SecretVal): Promise<string> {
	if (v && typeof (v as { get?: unknown }).get === 'function')
		return await (v as { get: () => Promise<string> }).get();
	return (v as string) ?? '';
}

export async function google_client(origin: string, env: GoogleEnv): Promise<Google> {
	const id = await get_secret(env.GOOGLE_ID);
	const secret = await get_secret(env.GOOGLE_SECRET);
	return new Google(id, secret, new URL('/auth/google/callback', origin).toString());
}

export { generateState, generateCodeVerifier };
