import type { User } from '$lib/types/user';
import { ensure_coll, find_by, get, upsert, ZERO } from './qdrant';
import { hash_pw, verify_pw } from './pw';

const local = new Map<string, User>();

export async function save_user(
	id: string,
	name: string,
	picture?: string,
	email?: string,
	provider: 'google' | 'local' = 'google'
): Promise<void> {
	const u: User = { s: 'u', n: name, p: picture, m: email, d: Date.now(), o: provider };
	const c = await get_user(id);
	if (c) {
		u.d = c.d;
		if (c.h) u.h = c.h;
	}
	try {
		await upsert([{ id, vector: ZERO(), payload: u as unknown as Record<string, unknown> }]);
	} catch {
		local.set(id, u);
	}
}

export async function get_user(id: string): Promise<User | null> {
	try {
		const r = await get([id]);
		const u = r[0]?.payload as Record<string, unknown> | undefined;
		if (u?.s === 'u') {
			return {
				s: 'u',
				n: u.n as string,
				p: u.p as string | undefined,
				m: u.m as string | undefined,
				d: u.d as number,
				o: u.o as 'google' | 'local' | undefined,
				h: u.h as string | undefined
			};
		}
		return null;
	} catch {
		return local.get(id) || null;
	}
}

export async function get_user_by_email(email: string): Promise<{ id: string; user: User } | null> {
	const em = email.toLowerCase();
	const look = (p: Record<string, unknown>, id: string): { id: string; user: User } | null => {
		if (p.s === 'u' && String(p.m ?? '').toLowerCase() === em) {
			return {
				id,
				user: {
					s: 'u',
					n: p.n as string,
					p: p.p as string | undefined,
					m: p.m as string | undefined,
					d: p.d as number,
					o: p.o as 'google' | 'local' | undefined,
					h: p.h as string | undefined
				}
			};
		}
		return null;
	};
	try {
		// server-side filtered lookup via the payload index on 'm'.
		await ensure_coll();
		const res = await find_by('m', em, 4);
		for (const p of res) {
			const r = look(p.payload as Record<string, unknown>, p.id);
			if (r) return r;
		}
	} catch {
		// ignore — fall through to local map
	}
	for (const [id, u] of local) {
		const r = look(u as unknown as Record<string, unknown>, id);
		if (r) return r;
	}
	return null;
}

export async function create_pw_user(email: string, password: string): Promise<string> {
	const id = crypto.randomUUID();
	const h = await hash_pw(password);
	await save_user(id, email, undefined, email, 'local');
	const c = await get_user(id);
	const u: User = { s: 'u', n: email, m: email, d: c?.d ?? Date.now(), o: 'local', h };
	try {
		await upsert([{ id, vector: ZERO(), payload: u as unknown as Record<string, unknown> }]);
	} catch {
		local.set(id, u);
	}
	return id;
}

export async function verify_user_pw(
	email: string,
	password: string
): Promise<{ id: string; user: User } | null> {
	const r = await get_user_by_email(email);
	if (!r || r.user.o !== 'local' || !r.user.h) return null;
	return (await verify_pw(password, r.user.h)) ? r : null;
}
