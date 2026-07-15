import { test, expect } from '@playwright/test';

test('register then login via api sets session and lands on home', async ({ request }) => {
	const email = `test+${Date.now()}@example.com`;
	const pw = 'password123';

	const reg = await request.post('/api/auth/register', {
		data: { e: email, p: pw }
	});
	expect(reg.ok()).toBeTruthy();

	const login = await request.post('/api/auth/login', {
		data: { e: email, p: pw }
	});
	expect(login.ok()).toBeTruthy();

	const bad = await request.post('/api/auth/login', {
		data: { e: email, p: 'wrong' }
	});
	expect(bad.status()).toBe(401);
});
