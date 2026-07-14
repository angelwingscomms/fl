<script lang="ts">
	let { data } = $props();
</script>

<h1 class="text-2xl font-bold mb-2">FL</h1>
<p class="text-zinc-400 mb-4">
	Freelance marketplace. Build a profile, post a job, get matched with the best freelancers.
</p>

<ul class="space-y-2">
	<li>
		<a class="underline" href="/profile">Create / edit your profile</a> — your about text, links, images.
	</li>
	<li>
		<a class="underline" href="/jobs/new">Post a job</a> — we'll match you with the top 9 freelancers.
	</li>
</ul>

{#if data.profiles?.length}
	<h2 class="text-lg font-semibold mt-6 mb-2">Freelancers</h2>
	<ul class="space-y-1">
		{#each data.profiles as p (p.handle)}
			<li><a class="underline" href="/u/{p.handle}">{p.handle}</a></li>
		{/each}
	</ul>
{/if}
