<script lang="ts">
	import { reveal, magnet } from '$lib/motion';

	let mode = $state<'login' | 'register'>('login');
	let email = $state('');
	let password = $state('');
	let msg = $state('');
	let busy = $state(false);

	async function submit() {
		if (busy) return;
		busy = true;
		msg = '';
		try {
			const r = await fetch(`/api/auth/${mode}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ e: email, p: password })
			});
			const d = (await r.json().catch(() => ({}))) as { message?: string };
			if (r.ok) location.href = '/';
			else msg = d.message ?? (mode === 'login' ? 'invalid credentials' : 'registration failed');
		} catch {
			msg = 'network error';
		} finally {
			busy = false;
		}
	}
</script>

<section class="container-fl py-20">
	<div class="card-fl p-8 sm:p-10 mx-auto max-w-md" use:reveal>
		<p class="eyebrow mb-3 text-center">welcome back</p>
		<h1 class="text-2xl sm:text-3xl text-center mb-8" style="font-family: var(--font-display);">
			{mode === 'login' ? 'sign in to' : 'join'} <em>fl</em>
		</h1>

		<a class="btn-ghost w-full mb-5" href="/auth/google" use:magnet={0.15}>continue with google</a>

		<div class="flex items-center gap-3 my-5 text-xs text-[var(--color-text-muted)]">
			<span class="flex-1 h-px bg-[var(--color-border)]"></span>
			or
			<span class="flex-1 h-px bg-[var(--color-border)]"></span>
		</div>

		<form
			class="space-y-3"
			onsubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			<input
				type="email"
				placeholder="email"
				bind:value={email}
				autocomplete="email"
				class="field-fl"
			/>
			<input
				type="password"
				placeholder="password"
				bind:value={password}
				autocomplete="current-password"
				class="field-fl"
			/>
			<button type="submit" class="btn-fl w-full justify-center" disabled={busy}>
				{busy ? '…' : mode === 'login' ? 'sign in' : 'sign up'}
				<span class="arrow">→</span>
			</button>
		</form>

		{#if msg}<p class="text-sm text-[var(--color-accent)] mt-4 text-center">{msg}</p>{/if}

		<button
			class="link-fl block mx-auto mt-6 text-sm text-[var(--color-text-muted)]"
			onclick={() => (mode = mode === 'login' ? 'register' : 'login')}
		>
			{mode === 'login' ? "need an account? register" : "have an account? sign in"}
		</button>
	</div>
</section>
