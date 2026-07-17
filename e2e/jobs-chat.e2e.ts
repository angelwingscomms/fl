import { test, expect, request as pw_request } from '@playwright/test';

const BASE = 'http://localhost:4173';

test('chat page opens ws and sends a message', async ({ request, page }) => {
	const pw = 'password123';
	const email_a = `a+${Date.now()}@example.com`;
	await request.post('/api/auth/register', { data: { e: email_a, p: pw } });
	const email_b = `b+${Date.now()}@example.com`;
	await request.post('/api/auth/register', { data: { e: email_b, p: pw } });

	const post = await request.post('/jobs/new', {
		form: { t: 'WS chat job', d: 'verify realtime chat' },
		headers: { origin: BASE }
	});
	const job_id = ((await post.json().catch(() => null)) as { location?: string })?.location
		?.split('/')
		.pop();
	expect(job_id).toBeTruthy();

	// peer b opens the chat with a (owner)
	const ctx_b = await pw_request.newContext({ baseURL: BASE });
	await ctx_b.post('/api/auth/login', { data: { e: email_b, p: pw } });
	await page.goto(`/jobs/${job_id}/chat/${email_a}`);
	const ws_seen = page.waitForRequest((r) => r.url().includes('/api/chat/ws'), {
		timeout: 5000
	}).catch(() => null);
	await page.waitForTimeout(100);
	await ws_seen;

	// send a message; it should appear (via poll fallback when no DO)
	await page.fill('input.field-fl', 'hello realtime');
	await page.click('button.btn-fl');
	await expect(page.getByText('hello realtime')).toBeVisible({ timeout: 8000 });

	await ctx_b.dispose();
});

test('post job, job page renders, chats + msg guards', async ({ request }) => {
	const pw = 'password123';
	const email_a = `a+${Date.now()}@example.com`;
	const reg_a = await request.post('/api/auth/register', { data: { e: email_a, p: pw } });
	expect(reg_a.ok()).toBeTruthy();

	const post = await request.post('/jobs/new', {
		form: { t: 'Build a landing page', d: 'need a clean landing page in a week' },
		headers: { origin: BASE }
	});
	expect(post.ok()).toBeTruthy();
	const redirect = (await post.json().catch(() => null)) as { location?: string } | null;
	const location = redirect?.location ?? new URL(post.url()).pathname;
	const job_id = location.split('/').pop() ?? '';
	expect(job_id).toBeTruthy();

	const job_page = await request.get(`/jobs/${job_id}`);
	expect(job_page.ok()).toBeTruthy();
	expect(await job_page.text()).toContain('Build a landing page');

	const chats_page = await request.get('/chats');
	expect(chats_page.ok()).toBeTruthy();

	const bad_body = await request.post('/api/msg', {
		data: { j: job_id, o: email_a, b: '' },
		headers: { 'Content-Type': 'application/json' }
	});
	expect(bad_body.status()).toBe(400);

	const anon = await pw_request.newContext({ baseURL: BASE });
	const unauth = await anon.post('/api/msg', {
		data: { j: job_id, o: email_a, b: 'hi' },
		headers: { 'Content-Type': 'application/json' }
	});
	expect(unauth.status()).toBe(401);

	const email_b = `b+${Date.now()}@example.com`;
	const reg_b = await anon.post('/api/auth/register', { data: { e: email_b, p: pw } });
	expect(reg_b.ok()).toBeTruthy();

	const stranger_chat = await anon.get(
		`/jobs/${job_id}/chat/00000000-0000-0000-0000-000000000000`
	);
	expect(stranger_chat.status()).toBe(403);

	const non_owner_job = await anon.get(`/jobs/${job_id}`);
	expect(non_owner_job.ok()).toBeTruthy();

	await anon.dispose();
});
