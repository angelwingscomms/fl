<script lang="ts">
	let { data } = $props();
</script>

<h1 class="text-xl font-bold mb-3">My jobs</h1>
{#if data.jobs.length}
	<ul class="space-y-1">
		{#each data.jobs as j (j.id)}
			<li><a class="underline" href="/jobs/{j.id}">{j.title}</a></li>
		{/each}
	</ul>
{:else}
	<p class="text-zinc-500">No jobs yet. <a class="underline" href="/jobs/new">Post one</a>.</p>
{/if}
