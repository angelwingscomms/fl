import { error, fail } from '@sveltejs/kit';
import { require_uid } from '$lib/server/session';
import { get, query, set_payload } from '$lib/server/qdrant';
import { get_user, credit_user } from '$lib/server/user';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const uid = require_uid(e);
	const id = e.params.id;

	const job = (await get([id], true))[0];
	if (!job || job.payload.s !== 'j') throw error(404, 'job not found');

	const is_owner = job.payload.u === uid;
	const base = {
		i: id,
		t: job.payload.t as string,
		d: job.payload.d as string,
		y: job.payload.y as string,
		c: job.payload.c as number,
		f: (job.payload.f as string) || null,
		e: (job.payload.e as number) || undefined
	};

	if (!is_owner) return { j: base, o: false as const, u: uid };

	const scored = await query(job.vector as number[], { must: [{ key: 's', match: { value: 'u' } }] }, 30);
	const m = scored
		.filter((p) => p.id !== uid && String(p.payload.t ?? '').trim())
		.slice(0, 9)
		.map((p) => ({
			i: p.id,
			n: p.payload.n as string,
			a: (p.payload.a as string) || null,
			t: String(p.payload.t ?? '').slice(0, 160),
			sc: Math.round(p.score * 100)
		}));

	const fn = base.f ? ((await get_user(base.f))?.n ?? null) : null;

	return { j: base, m, o: true as const, fn, u: uid };
};

async function load_owned_job(uid: string, id: string) {
	const job = (await get([id]))[0];
	if (!job || job.payload.s !== 'j') throw error(404, 'job not found');
	if (job.payload.u !== uid) throw error(403, 'only the job owner can do that');
	return job;
}

export const actions: Actions = {
	hire: async (e) => {
		const uid = require_uid(e);
		const id = e.params.id;
		const job = await load_owned_job(uid, id);
		if (job.payload.y !== 'o') return fail(400, { error: 'job is not open' });
		const f = await e.request.formData();
		const fid = String(f.get('f') ?? '');
		if (!fid) return fail(400, { error: 'freelancer required' });
		await set_payload(id, { f: fid, y: 'h' });
		return { ok: true };
	},

	unhire: async (e) => {
		const uid = require_uid(e);
		const id = e.params.id;
		const job = await load_owned_job(uid, id);
		if (job.payload.y !== 'h' || job.payload.e) return fail(400, { error: 'cannot unhire now' });
		await set_payload(id, { y: 'o', f: '' });
		return { ok: true };
	},

	release: async (e) => {
		const uid = require_uid(e);
		const id = e.params.id;
		const job = await load_owned_job(uid, id);
		const f = job.payload.f as string;
		if (job.payload.y !== 'f' || !f) return fail(400, { error: 'nothing to release' });
		await credit_user(f, job.payload.e as number);
		await set_payload(id, { y: 'r' });
		return { ok: true };
	}
};
