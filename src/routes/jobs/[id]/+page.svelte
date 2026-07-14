<script lang="ts">
	let { data } = $props();
</script>

<h1 class="text-2xl font-bold mb-1">{data.job.title}</h1>
<pre class="whitespace-pre-wrap bg-zinc-900 border border-zinc-800 rounded p-3 text-sm mb-4">{data
		.job.description}</pre>

<h2 class="text-lg font-semibold mb-2">Top 9 matching freelancers</h2>
{#if data.matches.length}
	<ul class="space-y-2">
		{#each data.matches as m (m.id)}
			<li class="border border-zinc-800 rounded p-3">
				<div class="flex justify-between">
					<a class="underline font-semibold" href="/u/{m.handle}">{m.handle}</a>
					<span class="text-xs text-zinc-500">{m.score.toFixed(3)}</span>
				</div>
				<p class="text-sm text-zinc-400 mt-1">{m.t}</p>
				<a class="text-sm underline" href="/jobs/{data.job.id}/msg/{m.id}">Message</a>
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-zinc-500">No freelancer profiles yet. Ask people to create one.</p>
{/if}
