// FL real-time messaging WebSocket backend. Hosted on Cloud Run.
// One room per conversation: `${job}__${peer}`. Both the client and the
// freelancer join the same room. Messages are persisted to Qdrant (k='msg').
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { load_history, persist_msg } from './qdrant.js';

const PORT = Number(process.env.PORT) || 8080;
const HEARTBEAT = 25000;

const server = createServer((_req, res) => {
	res.writeHead(200, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify({ ok: true }));
});
const wss = new WebSocketServer({ server });

// room -> Set<ws>
const rooms = new Map();

function join(ws, room) {
	if (!rooms.has(room)) rooms.set(room, new Set());
	rooms.get(room).add(ws);
	ws.room = room;
}
function leave(ws) {
	if (ws.room && rooms.has(ws.room)) {
		rooms.get(ws.room).delete(ws);
		if (rooms.get(ws.room).size === 0) rooms.delete(ws.room);
	}
}
function broadcast(room, obj) {
	const set = rooms.get(room);
	if (!set) return;
	const msg = JSON.stringify(obj);
	for (const c of set) if (c.readyState === 1) c.send(msg);
}

wss.on('connection', async (ws, req) => {
	const q = new URL(req.url, 'http://x').searchParams;
	const uid = q.get('uid') || '';
	const job = q.get('job') || '';
	const peer = q.get('peer') || '';
	if (!uid || !job || !peer) {
		ws.close(4001, 'missing uid/job/peer');
		return;
	}
	const room = `${job}__${peer}`;
	join(ws, room);
	ws.isAlive = true;
	ws.on('pong', () => (ws.isAlive = true));

	// register listeners BEFORE the async history load so early frames aren't dropped
	ws.on('message', async (data) => {
		console.error('RAW', data.toString().slice(0, 80));
		let m;
		try {
			m = JSON.parse(data.toString());
		} catch {
			return;
		}
		if (m.type !== 'msg' || typeof m.body !== 'string') return;
		const body = m.body.trim();
		if (!body) return;
		console.error('MSG received', body);
		try {
			const saved = await persist_msg({ job_id: job, from_id: uid, to_id: peer, body });
			console.error('MSG persisted', saved.body);
			broadcast(room, {
				type: 'msg',
				from: saved.from_id,
				body: saved.body,
				created_at: saved.created_at
			});
			console.error('MSG broadcasted to', room);
		} catch (e) {
			console.error('persist_msg failed', e);
			if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', error: 'persist failed' }));
		}
	});

	ws.on('close', () => leave(ws));
	ws.on('error', () => leave(ws));

	try {
		const history = await load_history(job);
		if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'history', messages: history }));
	} catch (e) {
		console.error('load_history failed', e);
	}
});

// Cloud Run / proxy idle timeouts: ping every 25s, kill dead sockets.
const interval = setInterval(() => {
	for (const ws of wss.clients) {
		if (ws.isAlive === false) return ws.terminate();
		ws.isAlive = false;
		ws.ping();
	}
}, HEARTBEAT);
wss.on('close', () => clearInterval(interval));

server.listen(PORT, () => console.log(`fl-ws listening on :${PORT}`));
