import { require_uid } from '$lib/server/session';
import { find } from '$lib/server/qdrant';
import type { PageServerLoad } from './$types';

function to_row(x: { id: string; payload: Record<string, unknown> }) {
	return { i: x.id, t: x.payload.t as string, y: x.payload.y as string, c: x.payload.c as number };
}

export const load: PageServerLoad = async (e) => {
	const uid = require_uid(e);
	const [posted, hired] = await Promise.all([
		find(
			{
				must: [
					{ key: 's', match: { value: 'j' } },
					{ key: 'u', match: { value: uid } }
				]
			},
			100
		),
		find(
			{
				must: [
					{ key: 's', match: { value: 'j' } },
					{ key: 'f', match: { value: uid } }
				]
			},
			100
		)
	]);
	return {
		p: posted.map(to_row).sort((a, b) => b.c - a.c),
		h: hired.map(to_row).sort((a, b) => b.c - a.c)
	};
};
