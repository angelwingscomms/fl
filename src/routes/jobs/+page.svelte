<script lang="ts">
	import { reveal, magnet } from '$lib/motion';
	let { data } = $props();

	const labels: Record<string, string> = { o: 'open', h: 'hired', f: 'in escrow', r: 'released' };
	const badge: Record<string, string> = { o: 'badge-o', h: 'badge-h', f: 'badge-f', r: 'badge-r' };
</script>

{#snippet row(j: { i: string; t: string; y: string }, i: number)}
	<li use:reveal={{ delay: i * 70 }}>
		<a class="card-fl interactive flex items-center justify-between gap-3 p-4" href="/jobs/{j.i}">
			<span class="font-semibold">{j.t}</span>
			<span class="badge-fl {badge[j.y] ?? 'badge-o'}">{labels[j.y] ?? j.y}</span>
		</a>
	</li>
{/snippet}

<section class="container-fl py-16">
	<p class="eyebrow mb-3">your desk</p>
	<h1 class="text-2xl sm:text-3xl mb-8" style="font-family: var(--font-display);">
		my <em>jobs</em>
	</h1>

	<h2 class="eyebrow mb-3">posted</h2>
	{#if data.p.length}
		<ul class="space-y-3 mb-10">
			{#each data.p as j, i (j.i)}
				{@render row(j, i)}
			{/each}
		</ul>
	{:else}
		<div class="card-fl p-6 mb-10 text-center" use:reveal>
			<p class="text-[var(--color-text-muted)] mb-4">
				nothing yet — post your first job. matching takes seconds.
			</p>
			<a class="btn-fl" href="/jobs/new" use:magnet>post a job <span class="arrow">→</span></a>
		</div>
	{/if}

	{#if data.h.length}
		<h2 class="eyebrow mb-3">hired on</h2>
		<ul class="space-y-3">
			{#each data.h as j, i (j.i)}
				{@render row(j, i)}
			{/each}
		</ul>
	{/if}
</section>
