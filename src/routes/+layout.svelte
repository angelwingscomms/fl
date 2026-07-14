<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<nav class="flex gap-4 p-3 border-b border-zinc-800 text-sm">
	<a class="font-bold" href="/">FL</a>
	<a href="/profile">Profile</a>
	<a href="/jobs/new">Post job</a>
	<a href="/jobs">My jobs</a>
</nav>

<main class="max-w-3xl mx-auto p-4">
	{@render children()}
</main>
