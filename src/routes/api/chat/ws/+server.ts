import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { get_uid } from '$lib/server/session';

export const GET: RequestHandler = async ({ request, locals, platform }) => {
	const uid = get_uid({ locals });
	if (!uid) throw error(401, 'login required');
	const url = new URL(request.url);
	const j = url.searchParams.get('j');
	const p = url.searchParams.get('p');
	if (!j || !p) throw error(400, 'j and p required');

	const chat = platform?.env?.CHAT;
	if (!chat) throw error(503, 'chat unavailable');

	const id = chat.idFromName(`${j}__${p}`);
	return chat.get(id).fetch(request);
};
