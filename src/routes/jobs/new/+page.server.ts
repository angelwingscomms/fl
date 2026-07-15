import { fail, redirect } from '@sveltejs/kit';
import { require_uid } from '$lib/server/session';
import { embed } from '$lib/server/embed';
import { ensure_coll, upsert } from '$lib/server/qdrant';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (e) => {
		const uid = require_uid(e);
		const f = await e.request.formData();
		const title = String(f.get('title') ?? '').trim();
		const description = String(f.get('description') ?? '').trim();
		if (!title) return fail(400, { error: 'title required' });

		await ensure_coll();
		const id = crypto.randomUUID();
		const vec = await embed(`${title}\n${description}`, {
			OPENROUTER_KEY: env.OPENROUTER_KEY
		});
		await upsert([
			{ id, vector: vec, payload: { s: uid, k: 'job', id, client_id: uid, title, description } }
		]);
		throw redirect(303, `/jobs/${id}`);
	}
};
