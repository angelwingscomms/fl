<script lang="ts">
	let { data } = $props();

	const labels: Record<string, string> = { o: 'open', h: 'hired', f: 'in escrow', r: 'released' };
</script>

{#snippet row(j: { i: string; t: string; y: string })}
	<li>
		<a class="card-fl flex items-center justify-between gap-3 p-4" href="/jobs/{j.i}">
			<span class="font-semibold">{j.t}</span>
			<span class="tag-fl">{labels[j.y] ?? j.y}</span>
		</a>
	</li>
{/snippet}

<h1 class="text-3xl font-bold mb-6">My jobs</h1>

<h2 class="eyebrow mb-3">Posted</h2>
{#if data.p.length}
	<ul class="space-y-3 mb-8">
		{#each data.p as j (j.i)}
			{@render row(j)}
		{/each}
	</ul>
{:else}
	<p class="text-[var(--color-text-muted)] mb-8">
		Nothing here yet. Post one — matching takes seconds.
	</p>
{/if}

{#if data.h.length}
	<h2 class="eyebrow mb-3">Hired on</h2>
	<ul class="space-y-3">
		{#each data.h as j (j.i)}
			{@render row(j)}
		{/each}
	</ul>
{/if}
