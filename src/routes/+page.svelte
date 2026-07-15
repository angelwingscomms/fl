<script lang="ts">
	let { data } = $props();
</script>

<section class="py-10">
	<p class="eyebrow mb-3">freelance, but sweet</p>
	<h1 class="text-display mb-4">Find the right<br />freelancer.</h1>
	<p class="text-[var(--color-text-muted)] max-w-xl mb-8">
		Freelance marketplace. Build a profile, post a job, get matched with the best freelancers.
	</p>

	<div class="grid gap-4 sm:grid-cols-2 max-w-2xl">
		<a class="card-fl p-5 block" href="/profile">
			<h3 class="text-lg font-semibold mb-1">Create your profile</h3>
			<p class="text-sm text-[var(--color-text-muted)]">Your about text, links, images.</p>
		</a>
		<a class="card-fl p-5 block" href="/jobs/new">
			<h3 class="text-lg font-semibold mb-1">Post a job</h3>
			<p class="text-sm text-[var(--color-text-muted)]">
				We'll match you with the top 9 freelancers.
			</p>
		</a>
	</div>
</section>

{#if data.profiles?.length}
	<section class="mt-12">
		<h2 class="text-2xl font-bold mb-4">Freelancers</h2>
		<div class="flex flex-wrap gap-2">
			{#each data.profiles as p (p.handle)}
				<a class="tag-fl hover:!text-[var(--color-accent)]" href="/u/{p.handle}">{p.handle}</a>
			{/each}
		</div>
	</section>
{/if}
