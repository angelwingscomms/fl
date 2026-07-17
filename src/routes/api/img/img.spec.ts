import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';
import { GET } from '../../i/[...k]/+server';

function fd_with(f: unknown) {
	return { get: (k: string) => (k === 'f' ? f : null) } as unknown as FormData;
}

describe('POST /api/img', () => {
	it('401 when unauthenticated', async () => {
		const res = await POST({
			locals: { user: null },
			platform: { env: { R2: { put: vi.fn(), get: vi.fn() } } }
		} as any);
		expect(res.status).toBe(401);
		expect((await res.json()).error).toBeTruthy();
	});

	it('503 when no R2 binding', async () => {
		const res = await POST({
			locals: { user: { id: 'u1' } },
			platform: { env: {} }
		} as any);
		expect(res.status).toBe(503);
		expect((await res.json()).error).toBe('no storage');
	});

	it('413 when file too large', async () => {
		const f = new File([new Uint8Array(1)], 'x.png', { type: 'image/png' });
		Object.defineProperty(f, 'size', { value: 5_000_001 });
		const res = await POST({
			request: { formData: async () => fd_with(f) },
			locals: { user: { id: 'u1' } },
			platform: { env: { R2: { put: vi.fn(), get: vi.fn() } } }
		} as any);
		expect(res.status).toBe(413);
	});

	it('415 when type not allowed', async () => {
		const f = new File([new Uint8Array(1)], 'x.gif', { type: 'image/gif' });
		const res = await POST({
			request: { formData: async () => fd_with(f) },
			locals: { user: { id: 'u1' } },
			platform: { env: { R2: { put: vi.fn(), get: vi.fn() } } }
		} as any);
		expect(res.status).toBe(415);
	});

	it('happy path puts to R2 and returns k', async () => {
		const f = new File([new Uint8Array(1)], 'x.png', { type: 'image/png' });
		const put = vi.fn();
		const res = await POST({
			request: { formData: async () => fd_with(f) },
			locals: { user: { id: 'u1' } },
			platform: { env: { R2: { put, get: vi.fn() } } }
		} as any);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.k.startsWith('u1/')).toBe(true);
		expect(put).toHaveBeenCalledTimes(1);
		expect(put.mock.calls[0][0]).toBe(body.k);
		expect(put.mock.calls[0][2]).toEqual({ httpMetadata: { contentType: 'image/png' } });
	});
});

describe('GET /i/[...k]', () => {
	it('404 when no R2 binding', async () => {
		await expect(GET({ params: { k: 'a/b' }, platform: { env: {} } } as any)).rejects.toMatchObject(
			{ status: 404 }
		);
	});

	it('404 when object missing', async () => {
		await expect(
			GET({
				params: { k: 'a/b' },
				platform: { env: { R2: { get: vi.fn().mockResolvedValue(null) } } }
			} as any)
		).rejects.toMatchObject({ status: 404 });
	});

	it('happy path streams body with headers', async () => {
		const obj = {
			body: new ReadableStream(),
			httpMetadata: { contentType: 'image/png' },
			httpEtag: '"abc"'
		};
		const res = await GET({
			params: { k: 'a/b' },
			platform: { env: { R2: { get: vi.fn().mockResolvedValue(obj) } } }
		} as any);
		expect(res.headers.get('content-type')).toBe('image/png');
		expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
		expect(res.headers.get('etag')).toBe('"abc"');
	});
});
