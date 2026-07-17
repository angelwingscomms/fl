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

{#if data.f?.length}
	<section class="mt-12">
		<h2 class="text-2xl font-bold mb-4">Freelancers</h2>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each data.f as p (p.n)}
				<a class="card-fl p-4 flex gap-3 items-start" href="/u/{p.n}">
					{#if p.a}
						<img src="/i/{p.a}" alt="" class="w-10 h-10 rounded-full object-cover shrink-0" />
					{:else}
						<span
							class="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] uppercase font-bold shrink-0"
							>{p.n[0]}</span
						>
					{/if}
					<div>
						<h3 class="font-semibold">{p.n}</h3>
						<p class="text-sm text-[var(--color-text-muted)]">{p.t}</p>
					</div>
				</a>
			{/each}
		</div>
	</section>
{/if}
