import { describe, it, expect } from 'vitest';
import { embed } from './embed';

describe('embed', () => {
	it('fallback returns a 4096-dim vector when no key', async () => {
		const v = await embed('hello world', {});
		expect(v.length).toBe(4096);
	});

	it('fallback is deterministic for the same text', async () => {
		const a = await embed('foo bar', {});
		const b = await embed('foo bar', {});
		expect(a).toEqual(b);
	});
});
