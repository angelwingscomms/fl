import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export const COOKIE = 'fl_uid';

export function get_uid(e: RequestEvent): string | null {
	return e.cookies.get(COOKIE) ?? null;
}

export function require_uid(e: RequestEvent): string {
	const u = get_uid(e);
	if (!u) throw redirect(303, '/profile');
	return u;
}
