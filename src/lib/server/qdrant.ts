// small Qdrant REST client. collection 'fl', tenant field 's' on payload.
// payload indexes are avoided: we filter client-side after scroll/query.
import type { RequestEvent } from '@sveltejs/kit';

const COLL = 'fl';
const DIM = 4096;

export type QEnv = { QDRANT_URL: string; QDRANT_KEY: string };

export type Point = { id: string; payload: Record<string, unknown>; vector?: number[] };

function env_of(e: RequestEvent): QEnv {
	const env = e.platform?.env ?? ({} as QEnv);
	return { QDRANT_URL: env.QDRANT_URL ?? '', QDRANT_KEY: env.QDRANT_KEY ?? '' };
}

async function qd(method: string, path: string, body: unknown, env: QEnv) {
	const r = await fetch(`${env.QDRANT_URL}${path}`, {
		method,
		headers: { 'api-key': env.QDRANT_KEY, 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});
	if (!r.ok) throw new Error(`qdrant ${method} ${path} ${r.status} ${await r.text()}`);
	return r.json();
}

let ensured = false;
export async function ensure_coll(e: RequestEvent) {
	if (ensured) return;
	const env = env_of(e);
	try {
		await qd('PUT', `/collections/${COLL}`, { vectors: { size: DIM, distance: 'Cosine' } }, env);
	} catch (err) {
		// collection may already exist — that's fine
		if (!String(err).includes('already exists')) throw err;
	}
	ensured = true;
}

export async function upsert(points: unknown[], e: RequestEvent) {
	const env = env_of(e);
	await qd('PUT', `/collections/${COLL}/points`, { points }, env);
}

export async function get(ids: string[], e: RequestEvent, withVector = false): Promise<Point[]> {
	const env = env_of(e);
	const j = await qd(
		'POST',
		`/collections/${COLL}/points/retrieve`,
		{ ids, with_payload: true, with_vector: withVector },
		env
	);
	return (j.result ?? []) as Point[];
}

export async function scroll(limit: number, e: RequestEvent): Promise<Point[]> {
	const env = env_of(e);
	const j = await qd(
		'POST',
		`/collections/${COLL}/points/scroll`,
		{ limit, offset: undefined, with_payload: true },
		env
	);
	return (j.result?.points ?? []) as Point[];
}

export type Scored = { id: string; score: number; payload: Record<string, unknown> };

export async function search(vector: number[], limit: number, e: RequestEvent): Promise<Scored[]> {
	const env = env_of(e);
	const j = await qd(
		'POST',
		`/collections/${COLL}/points/query`,
		{ vector, limit, with_payload: true },
		env
	);
	return (j.result?.points ?? []) as Scored[];
}

export const ZERO = () => new Array(DIM).fill(0);
export const is_profile = (p: Point) => p.payload.k === 'profile';
export const is_job = (p: Point) => p.payload.k === 'job';
export const is_msg = (p: Point) => p.payload.k === 'msg';
