// small Qdrant REST client. collection 'fl', tenant field 's' on payload.
// most lookups filter client-side after scroll/query; the 'm' (email) field
// has a keyword payload index for server-side user lookup (see ensure_coll).
// env is read from $env/dynamic/private (ver-style), no RequestEvent needed.
import { env } from '$env/dynamic/private';

const COLL = 'fl';
const DIM = 4096;

export type QEnv = { QDRANT_URL: string; QDRANT_KEY: string };

export type Point = { id: string; payload: Record<string, unknown>; vector?: number[] };

function env_of(): QEnv {
	return { QDRANT_URL: env.QDRANT_URL ?? '', QDRANT_KEY: env.QDRANT_KEY ?? '' };
}

async function qd(method: string, path: string, body: unknown, e: QEnv) {
	const r = await fetch(`${e.QDRANT_URL}${path}`, {
		method,
		headers: { 'api-key': e.QDRANT_KEY, 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});
	if (!r.ok) throw new Error(`qdrant ${method} ${path} ${r.status} ${await r.text()}`);
	return r.json();
}

let ensured = false;
export async function ensure_coll() {
	if (ensured) return;
	const e = env_of();
	try {
		await qd('PUT', `/collections/${COLL}`, { vectors: { size: DIM, distance: 'Cosine' } }, e);
	} catch (err) {
		// collection may already exist — that's fine
		if (!String(err).includes('already exists')) throw err;
	}
	// payload index on 'm' (email) so user lookup is server-side, not a full scroll+filter.
	try {
		await qd('PUT', `/collections/${COLL}/index`, { field_name: 'm', field_schema: 'keyword' }, e);
	} catch (err) {
		// index may already exist — that's fine
		if (!String(err).includes('already exists')) throw err;
	}
	ensured = true;
}

export async function upsert(points: unknown[]) {
	const e = env_of();
	await qd('PUT', `/collections/${COLL}/points`, { points }, e);
}

export async function get(ids: string[], withVector = false): Promise<Point[]> {
	const e = env_of();
	const j = await qd(
		'POST',
		`/collections/${COLL}/points/retrieve`,
		{ ids, with_payload: true, with_vector: withVector },
		e
	);
	return (j.result ?? []) as Point[];
}

export async function scroll(limit: number): Promise<Point[]> {
	const e = env_of();
	const j = await qd(
		'POST',
		`/collections/${COLL}/points/scroll`,
		{ limit, offset: undefined, with_payload: true },
		e
	);
	return (j.result?.points ?? []) as Point[];
}

// server-side filtered scroll (uses the payload index). match: exact keyword equality.
export async function find_by(field: string, value: string, limit = 1): Promise<Point[]> {
	const e = env_of();
	const j = await qd(
		'POST',
		`/collections/${COLL}/points/scroll`,
		{ limit, with_payload: true, filter: { must: [{ key: field, match: { value } }] } },
		e
	);
	return (j.result?.points ?? []) as Point[];
}

export type Scored = { id: string; score: number; payload: Record<string, unknown> };

export async function search(vector: number[], limit: number): Promise<Scored[]> {
	const e = env_of();
	const j = await qd(
		'POST',
		`/collections/${COLL}/points/query`,
		{ vector, limit, with_payload: true },
		e
	);
	return (j.result?.points ?? []) as Scored[];
}

export const ZERO = () => new Array(DIM).fill(0);
export const is_profile = (p: Point) => p.payload.k === 'profile';
export const is_job = (p: Point) => p.payload.k === 'job';
export const is_msg = (p: Point) => p.payload.k === 'msg';

export type SecretVal = string | { get?: () => Promise<string> } | undefined;

export async function get_secret(v: SecretVal): Promise<string> {
	if (v && typeof (v as { get?: unknown }).get === 'function')
		return await (v as { get: () => Promise<string> }).get();
	return (v as string) ?? '';
}

export const C = COLL;

export async function save_user(
	id: string,
	name: string,
	picture?: string,
	email?: string,
	provider: 'google' | 'local' = 'google'
): Promise<void> {
	const e = env_of();
	const u = { s: 'u', n: name, p: picture, m: email, d: Date.now(), o: provider };
	try {
		await qd(
			'PUT',
			`/collections/${COLL}/points`,
			{
				points: [{ id: `u_${id}`, vector: new Array(DIM).fill(0), payload: u }]
			},
			e
		);
	} catch {
		// best effort
	}
}
