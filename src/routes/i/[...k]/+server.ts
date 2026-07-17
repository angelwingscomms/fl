import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform }) => {
	const r2 = platform?.env.R2;
	if (!r2) throw error(404);
	const o = await r2.get(params.k);
	if (!o) throw error(404);
	return new Response(o.body, {
		headers: {
			'content-type': o.httpMetadata?.contentType ?? 'application/octet-stream',
			'cache-control': 'public, max-age=31536000, immutable',
			etag: o.httpEtag
		}
	});
};
