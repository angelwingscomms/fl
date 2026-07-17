// Qdrant REST client. single collection 'fl', kind discriminator on payload field 's'.
// env read from $env/dynamic/private (ver-style). errors throw — no local fallbacks.
import { env } from '$env/dynamic/private';

const COLL = 'fl';
export const DIM = 4096;
export const ZERO = () => new Array(DIM).fill(0);

export type Point = { id: string; payload: Record<string, unknown>; vector?: number[] };
export type Scored = { id: string; score: number; payload: Record<string, unknown> };
export type Filter = {
	must?: { key: string; match: { value: string } }[];
	should?: { key: string; match: { value: string } }[];
};

async function qd(method: string, path: string, body: unknown) {
	const r = await fetch(`${env.QDRANT_URL}${path}`, {
		method,
		headers: { 'api-key': env.QDRANT_KEY ?? '', 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined
	});
	if (!r.ok) throw new Error(`qdrant ${method} ${path} ${r.status} ${await r.text()}`);
	return r.json();
}

const INDEX_FIELDS = ['s', 'n', 'm', 'j', 'u', 'f', 'o'];

let ensured = false;
export async function ensure_coll(): Promise<void> {
	if (ensured) return;
	try {
		await qd('PUT', `/collections/${COLL}`, { vectors: { size: DIM, distance: 'Cosine' } });
	} catch (err) {
		if (!String(err).includes('already exists')) throw err;
	}
	for (const field of INDEX_FIELDS) {
		try {
			await qd('PUT', `/collections/${COLL}/index`, { field_name: field, field_schema: 'keyword' });
		} catch (err) {
			if (!String(err).includes('already exists')) throw err;
		}
	}
	ensured = true;
}

export async function get(ids: string[], with_vector = false): Promise<Point[]> {
	const j = await qd('POST', `/collections/${COLL}/points/retrieve`, {
		ids,
		with_payload: true,
		with_vector
	});
	return (j.result ?? []) as Point[];
}

export async function upsert(points: Point[]): Promise<void> {
	await qd('PUT', `/collections/${COLL}/points`, { points });
}

export async function set_payload(id: string, payload: Record<string, unknown>): Promise<void> {
	await qd('POST', `/collections/${COLL}/points/payload`, { payload, points: [id] });
}

export async function update_vector(id: string, vector: number[]): Promise<void> {
	await qd('PUT', `/collections/${COLL}/points/vectors`, { points: [{ id, vector }] });
}

export async function find(filter: Filter, limit = 10): Promise<Point[]> {
	const j = await qd('POST', `/collections/${COLL}/points/scroll`, {
		limit,
		filter,
		with_payload: true
	});
	return (j.result?.points ?? []) as Point[];
}

export async function find_by(field: string, value: string, limit = 1): Promise<Point[]> {
	return find({ must: [{ key: field, match: { value } }] }, limit);
}

export async function query(vector: number[], filter: Filter, limit: number): Promise<Scored[]> {
	const j = await qd('POST', `/collections/${COLL}/points/query`, {
		query: vector,
		filter,
		limit,
		with_payload: true
	});
	return (j.result?.points ?? []) as Scored[];
}

export async function id_uuid(s: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
	const b = new Uint8Array(buf).slice(0, 16);
	b[6] = (b[6] & 0x0f) | 0x50;
	b[8] = (b[8] & 0x3f) | 0x80;
	const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
