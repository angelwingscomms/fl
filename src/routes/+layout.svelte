<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Cursor from '$lib/Cursor.svelte';
	import { magnet } from '$lib/motion';
	import { onNavigate } from '$app/navigation';
	let { children, data } = $props();

	let theme = $state<'light' | 'dark'>('light');
	if (typeof document !== 'undefined') {
		theme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'light';
	}
	function toggle_theme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}

	onNavigate((nav) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await nav.complete;
			});
		});
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="grain"></div>
<Cursor />

<nav
	class="sticky top-0 z-50 flex items-center gap-5 px-5 py-3.5 text-sm bg-[color-mix(in_srgb,var(--color-canvas)_85%,transparent)] backdrop-blur border-b border-[var(--color-border)]"
>
	<a href="/" class="text-2xl" style="font-family: var(--font-display); font-style: italic;">
		fl<span style="color: var(--color-accent); font-style: normal;">*</span>
	</a>
	<div class="ml-auto flex items-center gap-5">
		<a class="link-fl text-[var(--color-text-muted)] hover:text-[var(--color-text)]" href="/chats"
			>Chats</a
		>
		<a class="link-fl text-[var(--color-text-muted)] hover:text-[var(--color-text)]" href="/jobs"
			>Jobs</a
		>
		<button class="icon-btn" aria-label="Toggle theme" onclick={toggle_theme}>
			{theme === 'dark' ? '☀' : '☾'}
		</button>
		{#if data.user}
			<a href="/profile" aria-label="Profile">
				{#if data.user.picture}
					<img src={data.user.picture} alt="" class="avatar avatar-32" />
				{:else}
					<span class="avatar avatar-32">{data.user.name?.[0] ?? '?'}</span>
				{/if}
			</a>
		{:else}
			<a class="link-fl text-[var(--color-text-muted)] hover:text-[var(--color-text)]" href="/login"
				>Sign in</a
			>
		{/if}
		<a class="btn-fl hidden sm:inline-flex" href="/jobs/new" use:magnet
			>Post a job <span class="arrow">→</span></a
		>
		<a class="icon-btn sm:hidden" href="/jobs/new" aria-label="Post a job">+</a>
	</div>
</nav>

<main>
	{@render children()}
</main>

<footer class="border-t border-[var(--color-border)] mt-24 pt-10 pb-14 px-5">
	<div class="container-wide">
		<p
			style="font-family: var(--font-display); font-size: clamp(3rem, 12vw, 6rem); line-height: 0.9; color: var(--color-text-muted); opacity: 0.5;"
		>
			fl<span style="color: var(--color-accent);">*</span>
		</p>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 text-sm text-[var(--color-text-muted)]">
			<a class="link-fl hover:text-[var(--color-text)]" href="/jobs/new">Post a job</a>
			<a class="link-fl hover:text-[var(--color-text)]" href="/login">Sign in</a>
		</div>
	</div>
</footer>
