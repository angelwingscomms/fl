import { fail, redirect } from '@sveltejs/kit';
import { get_uid } from '$lib/server/session';
import { embed } from '$lib/server/embed';
import { ensure_coll, get, upsert } from '$lib/server/qdrant';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const uid = get_uid(e);
	if (!uid) return { profile: null };
	try {
		const res = await get([uid], e);
		const p = res[0]?.payload;
		if (!p) return { profile: null };
		return {
			profile: {
				handle: String(p.handle ?? ''),
				t: String(p.t ?? ''),
				l: ((p.l as string[]) ?? []).join('\n'),
				i: ((p.i as string[]) ?? []).join('\n')
			}
		};
	} catch {
		return { profile: null };
	}
};

export const actions: Actions = {
	default: async (e) => {
		const f = await e.request.formData();
		const handle = String(f.get('handle') ?? '').trim();
		const t = String(f.get('t') ?? '');
		const l = (f.getAll('l') as string[]).map((s) => s.trim()).filter(Boolean);
		const i = (f.getAll('i') as string[]).map((s) => s.trim()).filter(Boolean);
		if (!handle)
			return fail(400, { error: 'handle required', handle, t, l: l.join('\n'), i: i.join('\n') });

		await ensure_coll(e);
		const uid = get_uid(e) ?? crypto.randomUUID();
		const vec = await embed(`${handle}\n${t}\n${l.join('\n')}`, {
			OPENROUTER_KEY: e.platform?.env?.OPENROUTER_KEY
		});
		await upsert(
			[
				{
					id: uid,
					vector: vec,
					payload: { s: uid, k: 'profile', id: uid, handle, t, l, i }
				}
			],
			e
		);
		e.cookies.set('fl_uid', uid, { path: '/', httpOnly: true, sameSite: 'lax' });
		throw redirect(303, `/u/${handle}`);
	}
};
