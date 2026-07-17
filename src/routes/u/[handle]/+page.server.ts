import { error } from '@sveltejs/kit';
import { get_uid } from '$lib/server/session';
import { get_user_by_handle } from '$lib/server/user';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (e) => {
	const hit = await get_user_by_handle(e.params.handle);
	if (!hit) throw error(404, 'profile not found');
	return {
		n: hit.user.n,
		t: hit.user.t ?? '',
		l: hit.user.l ?? [],
		i: hit.user.i ?? [],
		a: hit.user.a ?? '',
		is_owner: get_uid(e) === hit.id
	};
};
