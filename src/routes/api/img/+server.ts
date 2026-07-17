import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	const uid = locals.user?.id;
	if (!uid) return json({ error: 'unauthorized' }, { status: 401 });
	const r2 = platform?.env.R2;
	if (!r2) return json({ error: 'no storage' }, { status: 503 });
	const fd = await request.formData();
	const f = fd.get('f');
	if (!(f instanceof File)) return json({ error: 'bad file' }, { status: 400 });
	if (f.size > 5_000_000) return json({ error: 'too large' }, { status: 413 });
	if (!TYPES.includes(f.type)) return json({ error: 'bad type' }, { status: 415 });
	const k = `${uid}/${crypto.randomUUID()}`;
	await r2.put(k, f.stream(), { httpMetadata: { contentType: f.type } });
	return json({ k });
};
