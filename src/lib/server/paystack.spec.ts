import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: { PAYSTACK_TEST: '.', PAYSTACK_SECRET_KEY_TEST: 'sk_test_known_key' }
}));

const { verify_webhook_sig } = await import('./paystack');

async function sign(key: string, msg: string): Promise<string> {
	const k = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(key),
		{ name: 'HMAC', hash: 'SHA-512' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
	return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('verify_webhook_sig', () => {
	it('true for a correctly signed body', async () => {
		const body = JSON.stringify({ event: 'charge.success', data: { reference: 'r1' } });
		const sig = await sign('sk_test_known_key', body);
		expect(await verify_webhook_sig(body, sig)).toBe(true);
	});

	it('false for a tampered body', async () => {
		const body = JSON.stringify({ event: 'charge.success', data: { reference: 'r1' } });
		const sig = await sign('sk_test_known_key', body);
		expect(await verify_webhook_sig(body + 'x', sig)).toBe(false);
	});

	it('false for a wrong signature', async () => {
		const body = JSON.stringify({ event: 'charge.success', data: { reference: 'r1' } });
		expect(await verify_webhook_sig(body, 'deadbeef')).toBe(false);
	});
});
