export class ChatRoom {
	state: any;
	constructor(state: any) {
		this.state = state;
	}

	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url);
		if (req.headers.get('upgrade') === 'websocket') {
			// @ts-ignore WebSocketPair is a Workers runtime global
			const pair = new WebSocketPair();
			this.state.acceptWebSocket(pair[1]);
			return new Response(null, {
				status: 101,
				// @ts-ignore webSocket is a Workers-only ResponseInit field
				webSocket: pair[0]
			});
		}
		if (url.pathname === '/broadcast' && req.method === 'POST') {
			const body = await req.text();
			const socks = this.state.getWebSockets();
			for (const ws of socks) {
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
