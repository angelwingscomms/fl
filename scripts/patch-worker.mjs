// Post-build patch: inject the ChatRoom Durable Object + SvelteKit passthrough
// into the adapter-cloudflare generated worker. The adapter writes its bundle to
// `main` (.svelte-kit/cloudflare/_worker.js) and does not support a custom
// entry, so we rename its default export and append our DO class after build.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', '.svelte-kit', 'cloudflare', '_worker.js');

let src = readFileSync(target, 'utf8');

// 1. Rename SvelteKit's default handler object so we can wrap it.
if (!src.includes('var sveltekit = {')) {
	src = src.replace('var worker_default = {', 'var sveltekit = {');
}

// 2. Replace the `export { worker_default as default };` block with our wrapper
//    (passthrough to SvelteKit) plus the ChatRoom DO class export.
const chatRoom = `
export default {
	async fetch(req, env, ctx) {
		return sveltekit.fetch(req, env, ctx);
	}
};

export class ChatRoom {
	constructor(state) {
		this.state = state;
	}
	async fetch(req) {
		const url = new URL(req.url);
		if (req.headers.get('upgrade') === 'websocket') {
			const pair = new WebSocketPair();
			this.state.acceptWebSocket(pair[1]);
			return new Response(null, { status: 101, webSocket: pair[0] });
		}
		if (url.pathname === '/broadcast' && req.method === 'POST') {
			const body = await req.text();
			for (const ws of this.state.getWebSockets()) {
				try {
					ws.send(body);
				} catch {
					// drop dead sockets silently
				}
			}
			return new Response('ok');
		}
		return new Response('not found', { status: 404 });
	}
}
`;

const re = /export\s*\{\s*worker_default\s+as\s+default\s*\};/;
if (!re.test(src)) {
	throw new Error('could not find default export block to patch in ' + target);
}
src = src.replace(re, chatRoom.trimStart());

writeFileSync(target, src);
console.log('patched', target, '— ChatRoom DO injected');
