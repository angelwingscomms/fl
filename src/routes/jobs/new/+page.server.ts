import { fail, redirect } from '@sveltejs/kit';
import { require_uid } from '$lib/server/session';
import { embed } from '$lib/server/embed';
import { ensure_coll, upsert } from '$lib/server/qdrant';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	require_uid(e);
};

export const actions: Actions = {
	default: async (e) => {
		const uid = require_uid(e);
		const f = await e.request.formData();
		const t = String(f.get('t') ?? '').trim();
		const d = String(f.get('d') ?? '').trim();
		if (!t) return fail(400, { error: 'title required' });

		await ensure_coll();
		const id = crypto.randomUUID();
		const vec = await embed(`${t}\n${d}`, { OPENROUTER_KEY: env.OPENROUTER_KEY });
		await upsert([
			{ id, vector: vec, payload: { s: 'j', u: uid, t, d, c: Date.now(), y: 'o' } }
		]);
		throw redirect(303, `/jobs/${id}`);
	}
};
