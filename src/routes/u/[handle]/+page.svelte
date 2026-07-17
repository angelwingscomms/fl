<script lang="ts">
	import { reveal } from '$lib/motion';
	let { data } = $props();
</script>

<section class="container-fl py-16">
	<div class="flex items-center gap-4 mb-2" use:reveal>
		{#if data.a}
			<img src="/i/{data.a}" alt="" class="avatar avatar-96" />
		{:else}
			<span class="avatar avatar-96">{data.n[0]}</span>
		{/if}
		<div>
			<p class="eyebrow mb-1">on fl</p>
			<h1 class="text-3xl sm:text-4xl" style="font-family: var(--font-display);">{data.n}</h1>
		</div>
		{#if data.is_owner}<a class="tag-fl ml-auto" href="/profile">edit</a>{/if}
	</div>

	{#if data.i.length}
		<div class="grid grid-cols-3 gap-3 my-8" use:reveal={{ delay: 80 }}>
			{#each data.i as k (k)}
				<img
					src="/i/{k}"
					alt=""
					class="aspect-square w-full object-cover rounded-[var(--radius)] border border-[var(--color-border)]"
				/>
			{/each}
		</div>
	{/if}

	{#if data.t}
		<pre
			class="card-fl whitespace-pre-wrap p-5 text-sm font-sans leading-relaxed mt-6"
			use:reveal={{ delay: 120 }}>{data.t}</pre>
	{:else}
		<p class="text-[var(--color-text-muted)] mt-6" use:reveal={{ delay: 120 }}>
			nothing written yet.
		</p>
	{/if}

	{#if data.l.length}
		<h2 class="eyebrow mt-10 mb-3">links</h2>
		<ul class="flex flex-wrap gap-2" use:reveal={{ delay: 160 }}>
			{#each data.l as link (link)}
				<li><a class="tag-fl hover:!text-[var(--color-accent)] break-all" href={link}>{link}</a></li>
			{/each}
		</ul>
	{/if}

	{#if !data.is_owner}
		<div class="mt-10" use:reveal={{ delay: 200 }}>
			<a class="btn-fl" href="/jobs/new" data-cursor="Hire">hire {data.n} <span class="arrow">→</span></a>
		</div>
	{/if}
</section>
