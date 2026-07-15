import { describe, it, expect } from 'vitest';
import { hash_pw, verify_pw } from './pw';

describe('pw', () => {
	it('hash then verify succeeds', async () => {
		const h = await hash_pw('correct horse battery staple');
		expect(h).toContain('.');
		expect(await verify_pw('correct horse battery staple', h)).toBe(true);
	});

	it('wrong password fails', async () => {
		const h = await hash_pw('s3cret-password');
		expect(await verify_pw('wrong', h)).toBe(false);
	});

	it('different hashes for same password (salt)', async () => {
		const a = await hash_pw('same');
		const b = await hash_pw('same');
		expect(a).not.toBe(b);
		expect(await verify_pw('same', a)).toBe(true);
		expect(await verify_pw('same', b)).toBe(true);
	});
});
