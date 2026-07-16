// Qdrant access for the WS backend. Same collection 'fl', tenant field 's'.
// Messages stored as points with k='msg'; read via scroll + client-side filter.
const COLL = 'fl';
const DIM = 4096;
const ZERO = () => new Array(DIM).fill(0);

const env = () => ({
	url: process.env.QDRANT_URL ?? '',
	key: process.env.QDRANT_KEY ?? ''
});

async function qd(method, path, body) {
	const { url, key } = env();
	const r = await fetch(`${url}${path}`, {
		method,
		headers: { 'api-key': key, 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});
	if (!r.ok) throw new Error(`qdrant ${method} ${path} ${r.status} ${await r.text()}`);
	return r.json();
}

export async function load_history(job_id) {
	const j = await qd('POST', `/collections/${COLL}/points/scroll`, {
		limit: 200,
		offset: undefined,
		with_payload: true
	});
	const pts = (j.result?.points ?? [])
		.filter((p) => p.payload?.k === 'msg' && String(p.payload.job_id ?? '') === job_id)
		.map((p) => ({
			from: String(p.payload.from_id ?? ''),
			body: String(p.payload.body ?? ''),
			created_at: Number(p.payload.created_at ?? 0)
		}))
		.sort((a, b) => a.created_at - b.created_at);
	return pts;
}

export async function persist_msg({ job_id, from_id, to_id, body }) {
	const point = {
		id: crypto.randomUUID(),
		vector: ZERO(),
		payload: {
			s: job_id,
			k: 'msg',
			job_id,
			from_id,
			to_id,
			body,
			created_at: Date.now()
		}
	};
	await qd('PUT', `/collections/${COLL}/points`, { points: [point] });
	return point.payload;
}
