<script lang="ts">
	let { data } = $props();
</script>

<h1 class="text-4xl font-bold mb-3">{data.job.title}</h1>
<pre class="card-fl whitespace-pre-wrap p-5 text-sm font-sans leading-relaxed mb-8">{data.job
		.description}</pre>

<h2 class="text-2xl font-bold mb-4">Top 9 matching freelancers</h2>
{#if data.matches.length}
	<ul class="grid gap-3 sm:grid-cols-2">
		{#each data.matches as m (m.id)}
			<li class="card-fl p-4">
				<div class="flex items-center justify-between gap-2">
					<a class="font-semibold hover:!text-[var(--color-accent)]" href="/u/{m.handle}"
						>{m.handle}</a
					>
					<span class="tag-fl">{m.score.toFixed(3)}</span>
				</div>
				<p class="text-sm text-[var(--color-text-muted)] mt-2 line-clamp-3">{m.t}</p>
				<a class="btn-fl !mt-3 !py-1.5 !px-3 !text-xs" href="/jobs/{data.job.id}/msg/{m.id}"
					>Message</a
				>
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-[var(--color-text-muted)]">
		No freelancer profiles yet. Ask people to create one.
	</p>
{/if}
