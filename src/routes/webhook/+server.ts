import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verify_webhook_sig } from '$lib/server/paystack';
import { settle } from '$lib/server/pay';

export const POST: RequestHandler = async ({ request }) => {
	const raw = await request.text();
	const sig = request.headers.get('x-paystack-signature');
	if (!sig || !(await verify_webhook_sig(raw, sig))) throw error(401, 'invalid signature');

	const event = JSON.parse(raw) as { event?: string; data?: { reference: string; metadata?: unknown } };
	if (event.event === 'charge.success' && event.data) {
		const metadata = event.data.metadata;
		const md = (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) as
			| { a?: string }
			| undefined;
		if (md?.a === 'fl') {
			try {
				await settle(event.data.reference);
			} catch (err) {
				console.error('webhook settle failed', err);
			}
		}
	}
	return json({ received: true });
};
