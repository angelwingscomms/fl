<script lang="ts">
	let { data } = $props();
</script>

<h1 class="text-3xl font-bold mb-6">My jobs</h1>
{#if data.jobs.length}
	<ul class="space-y-3">
		{#each data.jobs as j (j.id)}
			<li>
				<a
					class="card-fl block p-4 font-semibold hover:!text-[var(--color-accent)]"
					href="/jobs/{j.id}">{j.title}</a
				>
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-[var(--color-text-muted)]">No jobs yet. <a href="/jobs/new">Post one</a>.</p>
{/if}
