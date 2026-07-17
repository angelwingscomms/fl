import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const upsert = vi.fn();
const set_payload = vi.fn();
const id_uuid = vi.fn(async (s: string) => `uuid-${s}`);
const ZERO = vi.fn(() => [0, 0, 0]);
const paystack_verify = vi.fn();

vi.mock('./qdrant', () => ({ get, upsert, set_payload, id_uuid, ZERO }));
vi.mock('./paystack', () => ({ paystack_verify }));

const { settle } = await import('./pay');

beforeEach(() => {
	get.mockReset();
	upsert.mockReset();
	set_payload.mockReset();
	id_uuid.mockClear();
	paystack_verify.mockReset();
});

describe('settle', () => {
	it('failed status returns null', async () => {
		paystack_verify.mockResolvedValue({ status: 'failed', reference: 'r1', amount: 500000, metadata: {} });
		const y = await settle('r1');
		expect(y).toBeNull();
		expect(set_payload).not.toHaveBeenCalled();
	});

	it('success + new ref writes payref and job payload, returns f', async () => {
		paystack_verify.mockResolvedValue({
			status: 'success',
			reference: 'r2',
			amount: 500000,
			metadata: { j: 'job1', user_id: 'user1' }
		});
		get.mockImplementation(async (ids: string[]) => {
			if (ids[0] === 'uuid-ps_r2') return [];
			return [];
		});
		const y = await settle('r2');
		expect(y).toBe('f');
		expect(upsert).toHaveBeenCalledWith([
			{ id: 'uuid-ps_r2', vector: [0, 0, 0], payload: { s: 'r', u: 'user1', j: 'job1', e: 500000 } }
		]);
		expect(set_payload).toHaveBeenCalledWith('job1', { y: 'f', e: 500000, r: 'r2' });
	});

	it('duplicate ref is idempotent — no second set_payload', async () => {
		paystack_verify.mockResolvedValue({
			status: 'success',
			reference: 'r3',
			amount: 500000,
			metadata: { j: 'job1', user_id: 'user1' }
		});
		get.mockImplementation(async (ids: string[]) => {
			if (ids[0] === 'uuid-ps_r3') return [{ id: 'uuid-ps_r3', payload: { s: 'r', j: 'job1' } }];
			if (ids[0] === 'job1') return [{ id: 'job1', payload: { s: 'j', y: 'f' } }];
			return [];
		});
		const y = await settle('r3');
		expect(y).toBe('f');
		expect(set_payload).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});

	it('metadata arriving as a JSON string is parsed', async () => {
		paystack_verify.mockResolvedValue({
			status: 'success',
			reference: 'r4',
			amount: 200000,
			metadata: JSON.stringify({ j: 'job2', user_id: 'user2' })
		});
		get.mockResolvedValue([]);
		const y = await settle('r4');
		expect(y).toBe('f');
		expect(set_payload).toHaveBeenCalledWith('job2', { y: 'f', e: 200000, r: 'r4' });
	});
});
