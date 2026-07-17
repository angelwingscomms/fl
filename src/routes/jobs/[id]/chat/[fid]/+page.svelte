<script lang="ts">
	import { onMount } from 'svelte';
	let { data } = $props();
	let msgs = $state([...data.t]);
	let draft = $state('');
	let sending = $state(false);
	let box: HTMLDivElement | undefined;

	function scroll_bottom() {
		requestAnimationFrame(() => {
			if (box) box.scrollTop = box.scrollHeight;
		});
	}

	async function poll() {
		if (document.hidden) return;
		try {
			const r = await fetch(`/api/msg?j=${data.j.i}&p=${data.p}`);
			const d = (await r.json()) as { t: { f: string; b: string; c: number }[] };
			if (d.t.length !== msgs.length) {
				msgs = d.t;
				scroll_bottom();
			}
		} catch {
			// ignore transient poll failures
		}
	}

	onMount(() => {
		scroll_bottom();
		const iv = setInterval(poll, 4000);
		return () => clearInterval(iv);
	});

	async function send() {
		const b = draft.trim();
		if (!b || sending) return;
		sending = true;
		draft = '';
		msgs = [...msgs, { f: data.u, b, c: Date.now() }];
		scroll_bottom();
		try {
			await fetch('/api/msg', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ j: data.j.i, o: data.p, b })
			});
		} finally {
			sending = false;
		}
	}
</script>

<div class="flex items-center gap-3 mb-1">
	{#if data.pa}
		<img src="/i/{data.pa}" alt="" class="w-10 h-10 rounded-full object-cover" />
	{:else}
		<span
			class="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] uppercase font-bold"
			>{data.ph[0] ?? '?'}</span
		>
	{/if}
	<h1 class="text-3xl font-bold">{data.ph}</h1>
</div>
<p class="text-[var(--color-text-muted)] mb-4">
	re: <a href="/jobs/{data.j.i}">{data.j.t}</a>
</p>

<div bind:this={box} class="card-fl p-4 mb-4 space-y-2 max-h-[60vh] overflow-y-auto">
	{#each msgs as m, idx (idx)}
		<div class="flex" class:justify-end={m.f === data.u}>
			<div
				class="max-w-[75%] rounded-2xl px-3 py-2 text-sm {m.f === data.u
					? 'bg-[var(--color-accent)] text-white'
					: 'card-fl'}"
			>
				{m.b}
			</div>
		</div>
	{/each}
</div>

<form
	class="flex gap-2"
	onsubmit={(e) => {
		e.preventDefault();
		send();
	}}
>
	<input bind:value={draft} class="field-fl flex-1" placeholder="Message…" />
	<button class="btn-fl" disabled={sending}>Send</button>
</form>
