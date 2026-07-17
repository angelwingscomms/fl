import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const find = vi.fn();
const upsert = vi.fn();
const ZERO = vi.fn(() => [0, 0, 0]);

vi.mock('$lib/server/qdrant', () => ({ get, find, upsert, ZERO }));

const { POST, GET } = await import('./+server');

function req(body: unknown) {
	return { json: async () => body } as Request;
}

const job = { id: 'job1', payload: { s: 'j', u: 'owner1' } };

beforeEach(() => {
	get.mockReset();
	find.mockReset();
	upsert.mockReset();
	get.mockResolvedValue([job]);
});

describe('POST /api/msg', () => {
	it('owner can message anyone on own job', async () => {
		const res = await POST({
			request: req({ j: 'job1', o: 'freelancer1', b: 'hi' }),
			locals: { user: { id: 'owner1' } }
		} as never);
		expect(res.status).toBe(200);
		expect(upsert).toHaveBeenCalled();
	});

	it('non-owner can message the owner', async () => {
		const res = await POST({
			request: req({ j: 'job1', o: 'owner1', b: 'hi' }),
			locals: { user: { id: 'freelancer1' } }
		} as never);
		expect(res.status).toBe(200);
	});

	it('non-owner cannot message another non-owner', async () => {
		await expect(
			POST({
				request: req({ j: 'job1', o: 'freelancer2', b: 'hi' }),
				locals: { user: { id: 'freelancer1' } }
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});

	it('rejects empty or too-long body', async () => {
		await expect(
			POST({
				request: req({ j: 'job1', o: 'owner1', b: '' }),
				locals: { user: { id: 'freelancer1' } }
			} as never)
		).rejects.toMatchObject({ status: 400 });
		await expect(
			POST({
				request: req({ j: 'job1', o: 'owner1', b: 'x'.repeat(2001) }),
				locals: { user: { id: 'freelancer1' } }
			} as never)
		).rejects.toMatchObject({ status: 400 });
	});

	it('requires login', async () => {
		await expect(
			POST({
				request: req({ j: 'job1', o: 'owner1', b: 'hi' }),
				locals: { user: null }
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});
});

describe('POST /api/msg fan-out', () => {
	it('broadcasts to CHAT DO when binding present', async () => {
		const chatFetch = vi.fn().mockResolvedValue(new Response('ok'));
		const idGet = vi.fn().mockReturnValue({ fetch: chatFetch });
		const idFromName = vi.fn().mockReturnValue({ get: idGet });
		const env = { CHAT: { idFromName } };
		await POST({
			request: req({ j: 'job1', o: 'freelancer1', b: 'hi' }),
			locals: { user: { id: 'owner1' } },
			platform: { env }
		} as never);
		expect(idFromName).toHaveBeenCalledWith('job1__freelancer1');
		expect(chatFetch).toHaveBeenCalled();
		const arg = chatFetch.mock.calls[0][1];
		expect(arg.method).toBe('POST');
		expect(JSON.parse(arg.body).b).toBe('hi');
	});

	it('does not throw when CHAT binding missing', async () => {
		const res = await POST({
			request: req({ j: 'job1', o: 'freelancer1', b: 'hi' }),
			locals: { user: { id: 'owner1' } },
			platform: { env: {} }
		} as never);
		expect(res.status).toBe(200);
	});
});

describe('GET /api/msg', () => {
	it('filters to the pair and sorts asc', async () => {
		find.mockResolvedValue([
			{ id: 'm3', payload: { s: 'm', j: 'job1', f: 'owner1', o: 'freelancer1', b: 'third', c: 300 } },
			{ id: 'm1', payload: { s: 'm', j: 'job1', f: 'freelancer1', o: 'owner1', b: 'first', c: 100 } },
			{ id: 'm2', payload: { s: 'm', j: 'job1', f: 'owner1', o: 'freelancer2', b: 'other pair', c: 200 } }
		]);
		const url = new URL('http://x/api/msg?j=job1&p=freelancer1');
		const res = await GET({ url, locals: { user: { id: 'owner1' } } } as never);
		const data = (await res.json()) as { t: { b: string }[] };
		expect(data.t.map((m) => m.b)).toEqual(['first', 'third']);
	});

	it('403 when uid is not a participant', async () => {
		const url = new URL('http://x/api/msg?j=job1&p=freelancer1');
		await expect(
			GET({ url, locals: { user: { id: 'someone-else' } } } as never)
		).rejects.toMatchObject({ status: 403 });
	});

	it('401 when not logged in', async () => {
		const url = new URL('http://x/api/msg?j=job1&p=freelancer1');
		await expect(GET({ url, locals: { user: null } } as never)).rejects.toMatchObject({
			status: 401
		});
	});
});
