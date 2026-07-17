import { fail, redirect } from '@sveltejs/kit';
import { require_uid } from '$lib/server/session';
import { embed } from '$lib/server/embed';
import { update_vector } from '$lib/server/qdrant';
import { get_user, get_user_by_handle, update_user } from '$lib/server/user';
import { env } from '$env/dynamic/private';
import type { User } from '$lib/types/user';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const uid = require_uid(e);
	const u = await get_user(uid);
	return {
		p: {
			n: u?.n ?? '',
			t: u?.t ?? '',
			l: (u?.l ?? []).join('\n'),
			b: u?.b ?? 0,
			a: u?.a ?? '',
			i: u?.i ?? []
		}
	};
};

export const actions: Actions = {
	default: async (e) => {
		const uid = require_uid(e);
		const f = await e.request.formData();
		const n = String(f.get('n') ?? '')
			.trim()
			.toLowerCase();
		const t = String(f.get('t') ?? '');
		const l = (f.getAll('l') as string[]).map((s) => s.trim()).filter(Boolean);
		const a = String(f.get('a') ?? '').trim();
		const i = (f.getAll('i') as string[]).map((s) => s.trim()).filter(Boolean);
		if (!/^[a-z0-9-]{2,30}$/.test(n))
			return fail(400, { error: 'handle must be 2-30 lowercase letters, digits, or dashes', n, t, l: l.join('\n') });
		const hit = await get_user_by_handle(n);
		if (hit && hit.id !== uid) return fail(400, { error: 'handle taken', n, t, l: l.join('\n') });
		const fields: Partial<User> = { n, t, l, a, i };
		await update_user(uid, fields);
		const vec = await embed(`${n}\n${t}`, { OPENROUTER_KEY: env.OPENROUTER_KEY });
		await update_vector(uid, vec);
		throw redirect(303, `/u/${n}`);
	}
};
