import { test, expect, request as pw_request } from '@playwright/test';

const BASE = process.env.E2E_BASE ?? 'http://localhost:4173';

async function login_ui(page: any, email: string, pw: string) {
	await page.goto('/login');
	await page.getByText('need an account').click();
	await page.fill('input[type=email]', email);
	await page.fill('input[type=password]', pw);
	await page.click('button[type=submit]');
	await page.waitForURL((u: URL) => u.pathname === '/');
}

test('chat page opens ws and sends a message', async ({ request, page, context }) => {
	const pw = 'password123';
	const email_a = `a+${Date.now()}@example.com`;
	const email_b = `b+${Date.now()}@example.com`;
	await request.post('/api/auth/register', { data: { e: email_a, p: pw } });
	await request.post('/api/auth/register', { data: { e: email_b, p: pw } });

	// ensure a matched freelancer exists for owner A
	const b_login = await pw_request.newContext({ baseURL: BASE });
	await b_login.post('/api/auth/login', { data: { e: email_b, p: pw } });
	await b_login
		.post('/profile', { form: { n: `peer-${Date.now()}`, t: 'I do the work that is needed.' } })
		.catch(() => {});
	await b_login.dispose();

	await login_ui(page, email_a, pw);
	await expect(page).toHaveURL((u: URL) => u.pathname === '/');
	await page.goto('/jobs/new');
	await expect(page).toHaveURL((u: URL) => u.pathname === '/jobs/new');
	await page.fill('input[name=t]', 'WS chat job');
	await page.fill('textarea[name=d]', 'verify realtime chat');
	await page.getByRole('button', { name: /post/i }).click();
	await page.waitForURL(/\/jobs\//, { timeout: 10000 });
	const job_id = page.url().split('/jobs/')[1];

	// open the chat with the matched freelancer
	const chat_link = page.locator('a[href*="/chat/"]').first();
	await expect(chat_link).toBeVisible({ timeout: 8000 });
	await chat_link.click();
	await expect(page).toHaveURL(/\/chat\//);

	// send a message; it should appear (poll fallback when no DO)
	await page.fill('input.field-fl', 'hello realtime');
	await page.click('button.btn-fl');
	await expect(page.getByText('hello realtime')).toBeVisible({ timeout: 8000 });
});

test('post job, job page renders, chats + msg guards', async ({ request, page }) => {
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
