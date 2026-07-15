import { require_uid } from '$lib/server/session';
import { scroll, is_job } from '$lib/server/qdrant';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const uid = require_uid(e);
	try {
		const res = await scroll(200);
		const jobs = res
			.filter((p) => is_job(p) && String(p.payload.client_id ?? '') === uid)
			.map((p) => ({ id: String(p.payload.id ?? ''), title: String(p.payload.title ?? '') }));
		return { jobs };
	} catch {
		return { jobs: [] };
	}
};
