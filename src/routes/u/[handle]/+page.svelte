<script lang="ts">
	let { data } = $props();
</script>

<div class="flex items-center gap-3 mb-1">
	<h1 class="text-4xl font-bold gradient-text">{data.handle}</h1>
	{#if data.is_owner}<a class="tag-fl hover:!text-[var(--color-accent)]" href="/profile">edit</a
		>{/if}
</div>

{#if data.i.length}
	<div class="grid grid-cols-3 gap-3 my-6">
		{#each data.i as url (url)}
			<img
				src={url}
				alt=""
				class="aspect-square w-full object-cover rounded-[var(--radius-xl)] border border-[var(--color-border)]"
			/>
		{/each}
	</div>
{/if}

{#if data.t}
	<pre class="card-fl whitespace-pre-wrap p-5 text-sm font-sans leading-relaxed">{data.t}</pre>
{/if}

{#if data.l.length}
	<h2 class="eyebrow mt-8 mb-3">Links</h2>
	<ul class="flex flex-wrap gap-2">
		{#each data.l as link (link)}
			<li><a class="tag-fl hover:!text-[var(--color-accent)] break-all" href={link}>{link}</a></li>
		{/each}
	</ul>
{/if}
