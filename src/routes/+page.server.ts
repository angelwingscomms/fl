import { find } from '$lib/server/qdrant';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const res = await find({ must: [{ key: 's', match: { value: 'u' } }] }, 48);
	const f = res
		.filter((p) => String(p.payload.t ?? '').trim())
		.map((p) => ({
			n: String(p.payload.n ?? ''),
			t: String(p.payload.t ?? '').slice(0, 140),
			a: String(p.payload.a ?? '')
		}));
	for (let i = f.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[f[i], f[j]] = [f[j], f[i]];
	}
	return { f: f.slice(0, 24) };
};
