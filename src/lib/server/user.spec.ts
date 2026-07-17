import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	create_pw_user,
	verify_user_pw,
	update_user,
	credit_user,
	get_user
} from './user';

type Cond = { key: string; match: { value: string } };

function mock_qdrant() {
	const store = new Map<string, { payload: Record<string, unknown>; vector?: number[] }>();
	const ok = (result: unknown) =>
		new Response(JSON.stringify({ result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
	global.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
		const u = String(url);
		const body = init?.body ? JSON.parse(String(init.body)) : {};
		if (u.includes('/points/retrieve')) {
			const result = (body.ids as string[])
				.filter((id) => store.has(id))
				.map((id) => ({ id, payload: store.get(id)!.payload }));
			return ok(result);
		}
		if (u.includes('/points/payload')) {
			for (const id of body.points as string[]) {
				const cur = store.get(id);
				if (cur) Object.assign(cur.payload, body.payload);
			}
			return ok(null);
		}
		if (u.includes('/points/vectors')) {
			for (const p of body.points as { id: string; vector: number[] }[]) {
				const cur = store.get(p.id);
				if (cur) cur.vector = p.vector;
			}
			return ok(null);
		}
		if (u.includes('/points/scroll')) {
			const must = (body.filter?.must ?? []) as Cond[];
			const points = [...store.entries()]
				.filter(([, v]) => must.every((m) => String(v.payload[m.key]) === String(m.match.value)))
				.slice(0, body.limit ?? 10)
				.map(([id, v]) => ({ id, payload: v.payload }));
			return ok({ points });
		}
		if (u.includes('/points/query')) return ok({ points: [] });
		if (u.endsWith('/points')) {
			for (const p of body.points as { id: string; payload: Record<string, unknown>; vector?: number[] }[])
				store.set(p.id, { payload: p.payload, vector: p.vector });
			return ok(null);
		}
		return ok(null);
	}) as unknown as typeof fetch;
	return store;
}

describe('user', () => {
	beforeEach(() => {
		mock_qdrant();
	});

	it('create_pw_user then verify_user_pw succeeds; wrong password fails', async () => {
		const id = await create_pw_user('a@b.com', 'password123');
		const ok = await verify_user_pw('a@b.com', 'password123');
		expect(ok?.id).toBe(id);
		expect(await verify_user_pw('a@b.com', 'wrong-password')).toBeNull();
	});

	it('handle collision appends -2 suffix', async () => {
		const id1 = await create_pw_user('same@x.com', 'password123');
		const id2 = await create_pw_user('same@y.com', 'password123');
		const u1 = await get_user(id1);
		const u2 = await get_user(id2);
		expect(u1?.n).toBe('same');
		expect(u2?.n).toBe('same-2');
	});

	it('update_user merges fields without clobbering h', async () => {
		const id = await create_pw_user('c@d.com', 'password123');
		await update_user(id, { t: 'hello', l: ['https://x.com'] });
		const u = await get_user(id);
		expect(u?.h).toBeTruthy();
		expect(u?.t).toBe('hello');
		expect(u?.l).toEqual(['https://x.com']);
		expect(u?.m).toBe('c@d.com');
	});

	it('credit_user adds to balance', async () => {
		const id = await create_pw_user('e@f.com', 'password123');
		await credit_user(id, 5000);
		await credit_user(id, 2500);
		const u = await get_user(id);
		expect(u?.b).toBe(7500);
	});
});
