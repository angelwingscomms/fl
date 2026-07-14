<script lang="ts">
	let { data, form } = $props();
	let p = $derived(data.profile ?? { handle: '', t: '', l: '', i: '' });
</script>

<h1 class="text-xl font-bold mb-3">{p.handle ? 'Edit' : 'Create'} your profile</h1>

{#if form?.error}<p class="text-red-400 mb-2">{form.error}</p>{/if}

<form method="POST" class="space-y-3">
	<label class="block">
		<span class="text-sm text-zinc-400">Handle</span>
		<input
			name="handle"
			value={p.handle}
			class="w-full bg-zinc-900 border border-zinc-700 rounded p-2"
			required
		/>
	</label>
	<label class="block">
		<span class="text-sm text-zinc-400">About (t) — everything about you</span>
		<textarea name="t" rows="8" class="w-full bg-zinc-900 border border-zinc-700 rounded p-2"
			>{p.t}</textarea
		>
	</label>
	<label class="block">
		<span class="text-sm text-zinc-400">Links (l) — one per line</span>
		<textarea name="l" rows="3" class="w-full bg-zinc-900 border border-zinc-700 rounded p-2"
			>{p.l}</textarea
		>
	</label>
	<label class="block">
		<span class="text-sm text-zinc-400">Image URLs (i) — one per line</span>
		<textarea name="i" rows="3" class="w-full bg-zinc-900 border border-zinc-700 rounded p-2"
			>{p.i}</textarea
		>
	</label>
	<button class="bg-zinc-100 text-zinc-900 rounded px-4 py-2 font-semibold">Save</button>
</form>
