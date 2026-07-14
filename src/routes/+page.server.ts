import { scroll, is_profile } from '$lib/server/qdrant';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	try {
		const res = await scroll(50, e);
		const profiles = res.filter(is_profile).map((p) => ({ handle: String(p.payload.handle ?? '') }));
		return { profiles };
	} catch {
		return { profiles: [] };
	}
};
