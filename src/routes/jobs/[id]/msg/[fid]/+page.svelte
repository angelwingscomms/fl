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
				messages = [
					...messages,
					{ from: m.from, body: m.body, created_at: m.created_at ?? Date.now() }
				];
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

<h1 class="text-3xl font-bold mb-1">Message {data.freelancer}</h1>
<p class="text-[var(--color-text-muted)] mb-1">
	re: <a href="/jobs/{data.job.id}">{data.job.title}</a>
</p>
<p class="text-xs text-[var(--color-text-muted)] mb-4">{status}</p>

<div class="space-y-3 mb-6">
	{#each messages as m (m.created_at ?? crypto.randomUUID())}
		<div class="card-fl p-3 text-sm">
			<span class="text-xs text-[var(--color-text-muted)]"
				>{m.from === data.freelancer ? data.freelancer : 'you'}</span
			>
			<p class="mt-1">{m.body}</p>
		</div>
	{/each}
</div>

<form
	class="space-y-3"
	onsubmit={(e) => {
		e.preventDefault();
		send();
	}}
>
	<textarea bind:value={draft} rows="3" class="field-fl" required></textarea>
	<button class="btn-fl" disabled={!data.wsUrl}>Send</button>
</form>
