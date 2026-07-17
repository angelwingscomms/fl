import { get, upsert, set_payload, id_uuid, ZERO } from './qdrant';
import { paystack_verify } from './paystack';

export async function settle(reference: string): Promise<string | null> {
	const r = await paystack_verify(reference);
	if (r.status !== 'success') return null;

	const ref_id = await id_uuid('ps_' + reference);
	const existing = (await get([ref_id]))[0];
	if (existing) {
		const j = existing.payload.j as string;
		const job = (await get([j]))[0];
		return (job?.payload.y as string) ?? null;
	}

	const metadata = r.metadata;
	const md = (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) as {
		j: string;
		user_id: string;
	};
	const j = md.j;
	await get([j]);

	await upsert([{ id: ref_id, vector: ZERO(), payload: { s: 'r', u: md.user_id, j, e: r.amount } }]);
	await set_payload(j, { y: 'f', e: r.amount, r: reference });
	return 'f';
}
