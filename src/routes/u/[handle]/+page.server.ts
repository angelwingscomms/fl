import { error } from '@sveltejs/kit';
import { scroll, is_profile } from '$lib/server/qdrant';
import { get_uid } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const handle = e.params.handle;
	try {
		const res = await scroll(100);
		const p = res.find((x) => is_profile(x) && String(x.payload.handle ?? '') === handle)?.payload;
		if (!p) throw error(404, 'profile not found');
		return {
			handle: String(p.handle ?? ''),
			t: String(p.t ?? ''),
			l: (p.l as string[]) ?? [],
			i: (p.i as string[]) ?? [],
			is_owner: get_uid(e) === p.id
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		throw error(500, 'failed to load profile');
	}
};
