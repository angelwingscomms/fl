// @ts-nocheck
// Thin Worker entry: wraps SvelteKit's generated handler and adds a
// Cloudflare Durable Object WebSocket route. Compiled by Wrangler (esbuild +
// @cloudflare/workers-types); ts-nocheck avoids re-typechecking the generated
// .svelte-kit output that this file imports.
import sveltekit from '../../.svelte-kit/cloudflare/_worker.js';
import { ChatRoom } from './chat_room';
import { decode_session } from '../lib/server/session';

function room_key(j: string, p: string): string {
	return `${j}__${p}`;
}

export { ChatRoom };

export default {
	async fetch(req: Request, env: any, ctx: any): Promise<Response> {
		const url = new URL(req.url);
		if (url.pathname === '/api/chat/ws') {
			if (req.headers.get('upgrade') !== 'websocket') {
				return new Response('expected websocket', { status: 400 });
			}
			const j = url.searchParams.get('j');
			const p = url.searchParams.get('p');
			if (!j || !p) return new Response('j and p required', { status: 400 });
			const raw = req.headers
				.get('cookie')
				?.split(';')
				.find((c) => c.trim().startsWith('session='))
				?.split('=')[1];
			const sess = await decode_session(raw);
			if (!sess) return new Response('login required', { status: 401 });
			const id = env.CHAT.idFromName(room_key(j, p));
			return id.get().fetch(req);
		}
		return sveltekit.fetch(req, env, ctx);
	}
};
