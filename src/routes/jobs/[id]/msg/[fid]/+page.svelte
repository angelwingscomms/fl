<script lang="ts">
	import { onMount } from 'svelte';
	let { data } = $props();
	let messages = $state([...data.thread]);
	let draft = $state('');
	let status = $state(data.wsUrl ? 'connecting…' : 'realtime not configured');
	let ws: WebSocket | null = null;

	onMount(() => {
		if (!data.wsUrl) return;
		const url = `${data.wsUrl}?uid=${encodeURIComponent(data.uid)}&job=${encodeURIComponent(data.job.id)}&peer=${encodeURIComponent(data.peer)}`;
		ws = new WebSocket(url);
		ws.onopen = () => (status = 'connected');
		ws.onclose = () => (status = 'disconnected');
		ws.onerror = () => (status = 'error');
		ws.onmessage = (ev) => {
			const m = JSON.parse(ev.data);
			if (m.type === 'history')
				messages = m.messages.map((x: { from: string; body: string; created_at: number }) => ({
					from: x.from,
					body: x.body,
					created_at: x.created_at ?? 0
				}));
			else if (m.type === 'msg')
				messages = [...messages, { from: m.from, body: m.body, created_at: m.created_at ?? Date.now() }];
		};
		return () => ws?.close();
	});

	function send() {
		const body = draft.trim();
		if (!body || !ws || ws.readyState !== 1) return;
		ws.send(JSON.stringify({ type: 'msg', body }));
		draft = '';
	}
</script>

<h1 class="text-xl font-bold mb-1">Message {data.freelancer}</h1>
<p class="text-zinc-400 mb-1">
	re: <a class="underline" href="/jobs/{data.job.id}">{data.job.title}</a>
</p>
<p class="text-xs text-zinc-500 mb-3">{status}</p>

<div class="space-y-2 mb-4">
	{#each messages as m (m.created_at ?? crypto.randomUUID())}
		<div class="border border-zinc-800 rounded p-2 text-sm">
			<span class="text-xs text-zinc-500">{m.from === data.freelancer ? data.freelancer : 'you'}</span>
			<p>{m.body}</p>
		</div>
	{/each}
</div>

<form class="space-y-2" onsubmit={(e) => { e.preventDefault(); send(); }}>
	<textarea bind:value={draft} rows="3" class="w-full bg-zinc-900 border border-zinc-700 rounded p-2" required></textarea>
	<button class="bg-zinc-100 text-zinc-900 rounded px-4 py-2 font-semibold" disabled={!data.wsUrl}>Send</button>
</form>
