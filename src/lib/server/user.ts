import type { User } from '$lib/types/user';
import { ensure_coll, find_by, get, set_payload, upsert, ZERO } from './qdrant';
import { hash_pw, verify_pw } from './pw';

export async function get_user(id: string): Promise<User | null> {
	const r = await get([id]);
	const p = r[0]?.payload;
	return p?.s === 'u' ? (p as unknown as User) : null;
}

export async function get_user_by_email(email: string): Promise<{ id: string; user: User } | null> {
	const r = await find_by('m', email.toLowerCase(), 1);
	const p = r[0];
	return p ? { id: p.id, user: p.payload as unknown as User } : null;
}

export async function get_user_by_handle(handle: string): Promise<{ id: string; user: User } | null> {
	const r = await find_by('n', handle.toLowerCase(), 1);
	const p = r[0];
	return p ? { id: p.id, user: p.payload as unknown as User } : null;
}

async function unique_handle(base: string, self_id?: string): Promise<string> {
	let cand = base.toLowerCase().replace(/[^a-z0-9-]/g, '');
	if (cand.length < 2) cand = 'user';
	let n = cand;
	let i = 1;
	for (;;) {
		const hit = await get_user_by_handle(n);
		if (!hit || hit.id === self_id) return n;
		i++;
		n = `${cand}-${i}`;
	}
}

export async function create_user(fields: Partial<User>): Promise<string> {
	await ensure_coll();
	const id = crypto.randomUUID();
	const n = await unique_handle(fields.n || fields.m?.split('@')[0] || '');
	const u: User = { ...fields, s: 'u', n, d: fields.d ?? Date.now() };
	await upsert([{ id, vector: ZERO(), payload: u as unknown as Record<string, unknown> }]);
	return id;
}

export async function update_user(id: string, fields: Partial<User>): Promise<void> {
	await set_payload(id, fields as Record<string, unknown>);
}

export async function credit_user(id: string, kobo: number): Promise<void> {
	const u = await get_user(id);
	await set_payload(id, { b: (u?.b ?? 0) + kobo });
}

export async function create_pw_user(email: string, password: string): Promise<string> {
	const h = await hash_pw(password);
	return create_user({ n: email.split('@')[0], m: email.toLowerCase(), h, o: 'local', d: Date.now() });
}

export async function verify_user_pw(
	email: string,
	password: string
): Promise<{ id: string; user: User } | null> {
	const r = await get_user_by_email(email);
	if (!r || r.user.o !== 'local' || !r.user.h) return null;
	return (await verify_pw(password, r.user.h)) ? r : null;
}
