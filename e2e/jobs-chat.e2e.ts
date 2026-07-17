import { test, expect, request as pw_request } from '@playwright/test';

const BASE = 'http://localhost:4173';

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
