<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<nav
	class="sticky top-0 z-50 flex items-center gap-5 px-5 py-3 text-sm backdrop-blur-xl border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-canvas)_72%,transparent)]"
>
	<a class="font-display text-lg font-bold" href="/">FL</a>
	<div class="ml-auto flex items-center gap-5">
		<a class="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" href="/profile"
			>Profile</a
		>
		<a class="btn-fl !py-1.5 !px-3 !text-xs" href="/jobs/new">Post job</a>
		<a class="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" href="/jobs"
			>My jobs</a
		>
	</div>
</nav>

<main class="container-fl py-10">
	{@render children()}
</main>
