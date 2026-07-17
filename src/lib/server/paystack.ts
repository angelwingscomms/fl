import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const BASE = 'https://api.paystack.co';

export interface PaystackInitResult {
	authorization_url: string;
	access_code: string;
	reference: string;
}

export interface PaystackVerifyResult {
	status: string;
	reference: string;
	amount: number;
	metadata: Record<string, unknown>;
}

export function get_secret_key(): string {
	const paystack_test = env.PAYSTACK_TEST;
	const is_test =
		paystack_test !== undefined && paystack_test !== null ? paystack_test === '.' : dev;
	const key = is_test
		? env.PAYSTACK_SECRET_KEY_TEST || env.PAYSTACK_SECRET_KEY
		: env.PAYSTACK_SECRET_KEY_LIVE || env.PAYSTACK_SECRET_KEY;
	return key || '';
}

export async function paystack_init(
	email: string,
	amount_kobo: number,
	reference: string,
	callback_url: string,
	metadata?: Record<string, unknown>
): Promise<PaystackInitResult> {
	const secret_key = get_secret_key();
	const res = await fetch(`${BASE}/transaction/initialize`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${secret_key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email,
			amount: amount_kobo,
			reference,
			callback_url,
			metadata: JSON.stringify({ ...metadata, a: 'fl' })
		})
	});
	if (!res.ok) throw new Error(`Paystack init failed: ${await res.text()}`);
	const body = (await res.json()) as {
		status: boolean;
		message?: string;
		data: PaystackInitResult;
	};
	if (!body.status) throw new Error(`Paystack init error: ${body.message}`);
	return body.data;
}

export async function paystack_verify(reference: string): Promise<PaystackVerifyResult> {
	const secret_key = get_secret_key();
	const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
		headers: { Authorization: `Bearer ${secret_key}`, 'Content-Type': 'application/json' }
	});
	if (!res.ok) throw new Error(`Paystack verify failed: ${await res.text()}`);
	const body = (await res.json()) as {
		status: boolean;
		message?: string;
		data: PaystackVerifyResult;
	};
	if (!body.status) throw new Error(`Paystack verify error: ${body.message}`);
	return body.data;
}

async function hmac_sha512_hex(key: string, msg: string): Promise<string> {
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

export async function verify_webhook_sig(raw_body: string, signature: string): Promise<boolean> {
	const secret_key = get_secret_key();
	if (!secret_key || !signature) return false;
	const hash = await hmac_sha512_hex(secret_key, raw_body);
	if (hash.length !== signature.length) return false;
	let diff = 0;
	for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ signature.charCodeAt(i);
	return diff === 0;
}
