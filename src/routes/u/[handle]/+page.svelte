<script lang="ts">
	let { data } = $props();
</script>

<h1 class="text-2xl font-bold mb-1">{data.handle}</h1>
{#if data.is_owner}<a class="text-sm underline" href="/profile">edit</a>{/if}

{#if data.i.length}
	<div class="grid grid-cols-3 gap-2 my-3">
		{#each data.i as url (url)}
			<img src={url} alt="" class="w-full h-32 object-cover rounded border border-zinc-800" />
		{/each}
	</div>
{/if}

{#if data.t}
	<pre
		class="whitespace-pre-wrap bg-zinc-900 border border-zinc-800 rounded p-3 text-sm">{data.t}</pre>
{/if}

{#if data.l.length}
	<h2 class="text-sm text-zinc-400 mt-3 mb-1">Links</h2>
	<ul class="list-disc list-inside">
		{#each data.l as link (link)}
			<li><a class="underline break-all" href={link}>{link}</a></li>
		{/each}
	</ul>
{/if}
