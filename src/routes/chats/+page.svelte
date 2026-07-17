<script lang="ts">
	import { reveal } from '$lib/motion';
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

<section class="container-fl py-16">
	<p class="eyebrow mb-3">the inbox</p>
	<h1 class="text-2xl sm:text-3xl mb-8" style="font-family: var(--font-display);">
		your <em>chats</em>
	</h1>

	{#if data.rows.length}
		<ul class="space-y-3">
			{#each data.rows as r, i (r.j + r.p)}
				<li use:reveal={{ delay: i * 70 }}>
					<a class="card-fl interactive flex items-center gap-3 p-4" href={r.l}>
						{#if r.pa}
							<img src="/i/{r.pa}" alt="" class="avatar avatar-48" />
						{:else}
							<span class="avatar avatar-48">{r.pn[0] ?? '?'}</span>
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
		<div class="card-fl p-6 text-center" use:reveal>
			<p class="text-[var(--color-text-muted)]">no chats yet — matches start when you say hi.</p>
		</div>
	{/if}
</section>
