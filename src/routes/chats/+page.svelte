<script lang="ts">
	let { data } = $props();

	function rel(c: number) {
		const s = Math.floor((Date.now() - c) / 1000);
		if (s < 60) return 'just now';
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h / 24)}d ago`;
	}
</script>

<h1 class="text-3xl font-bold mb-6">Chats</h1>

{#if data.rows.length}
	<ul class="space-y-3">
		{#each data.rows as r (r.j + r.p)}
			<li>
				<a class="card-fl flex items-center gap-3 p-4" href={r.l}>
					{#if r.pa}
						<img src="/i/{r.pa}" alt="" class="w-10 h-10 rounded-full object-cover" />
					{:else}
						<span
							class="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] uppercase font-bold shrink-0"
							>{r.pn[0] ?? '?'}</span
						>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between gap-2">
							<span class="font-semibold">{r.pn}</span>
							<span class="text-xs text-[var(--color-text-muted)] shrink-0">{rel(r.c)}</span>
						</div>
						<p class="text-xs text-[var(--color-text-muted)]">re: {r.jt}</p>
						<p class="text-sm truncate">{r.b}</p>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-[var(--color-text-muted)]">No chats yet. Matches start when you say hi.</p>
{/if}
