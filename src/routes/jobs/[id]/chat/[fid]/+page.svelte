<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { reveal } from '$lib/motion';
	let { data } = $props();
	let msgs = $state(untrack(() => [...data.t]));
	let draft = $state('');
	let sending = $state(false);
	let box: HTMLDivElement | undefined;
	let live = $state(false);
	let ws: WebSocket | undefined;
	let retry: ReturnType<typeof setTimeout> | undefined;

	function connect() {
		if (typeof WebSocket === 'undefined') return;
		const url = `/api/chat/ws?j=${encodeURIComponent(data.j.i)}&p=${encodeURIComponent(data.p)}`;
		try {
			ws = new WebSocket(url);
		} catch {
			return;
		}
		ws.onopen = () => (live = true);
		ws.onmessage = (e) => {
			const m = JSON.parse(e.data) as { f: string; b: string; c: number };
			if (!msgs.some((x) => x.c === m.c)) {
				msgs = [...msgs, m];
				scroll_bottom();
			}
		};
		ws.onclose = () => {
			live = false;
			ws = undefined;
			retry = setTimeout(connect, 2000);
		};
		ws.onerror = () => ws?.close();
	}

	function scroll_bottom() {
		requestAnimationFrame(() => {
			if (box) box.scrollTop = box.scrollHeight;
		});
	}

	function rel(c: number) {
		const d = new Date(c);
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	async function poll() {
		if (document.hidden || live) return;
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
		connect();
		const iv = setInterval(poll, 4000);
		return () => {
			clearInterval(iv);
			if (retry) clearTimeout(retry);
			ws?.close();
		};
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

<section class="container-fl py-16">
	<div class="flex items-center gap-3 mb-1" use:reveal>
		{#if data.pa}
			<img src="/i/{data.pa}" alt="" class="avatar avatar-48" />
		{:else}
			<span class="avatar avatar-48">{data.ph[0] ?? '?'}</span>
		{/if}
		<div>
			<p class="eyebrow mb-1">chat</p>
			<h1 class="text-2xl sm:text-3xl" style="font-family: var(--font-display);">{data.ph}</h1>
		</div>
	</div>
	<p class="text-[var(--color-text-muted)] mb-6">
		re: <a class="link-fl" href="/jobs/{data.j.i}">{data.j.t}</a>
	</p>

	<div class="card-fl p-4">
		<div bind:this={box} class="space-y-3 max-h-[55vh] overflow-y-auto p-1">
			{#each msgs as m, idx (idx)}
				<div class="flex flex-col" class:items-end={m.f === data.u} class:items-start={m.f !== data.u}>
					<div
						class="max-w-[75%] rounded-[var(--radius)] px-3.5 py-2 text-sm {m.f === data.u
							? 'bg-[var(--color-accent)] text-[var(--color-surface)]'
							: 'bg-[var(--color-surface)] border border-[var(--color-border)]'}"
					>
						{m.b}
					</div>
					<span class="text-[0.65rem] text-[var(--color-text-muted)] mt-1 px-1">{rel(m.c)}</span>
				</div>
			{/each}
		</div>

		<form
			class="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]"
			onsubmit={(e) => {
				e.preventDefault();
				send();
			}}
		>
			<input bind:value={draft} class="field-fl flex-1" placeholder="message…" />
			<button class="btn-fl" disabled={sending}>send</button>
		</form>
	</div>
</section>
