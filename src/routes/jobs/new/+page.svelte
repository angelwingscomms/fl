<script lang="ts">
	let { form } = $props();
</script>

<h1 class="text-xl font-bold mb-3">Post a job</h1>
{#if form?.error}<p class="text-red-400 mb-2">{form.error}</p>{/if}

<form method="POST" class="space-y-3">
	<label class="block">
		<span class="text-sm text-zinc-400">Title</span>
		<input name="title" class="w-full bg-zinc-900 border border-zinc-700 rounded p-2" required />
	</label>
	<label class="block">
		<span class="text-sm text-zinc-400">Description</span>
		<textarea
			name="description"
			rows="8"
			class="w-full bg-zinc-900 border border-zinc-700 rounded p-2"></textarea>
	</label>
	<button class="bg-zinc-100 text-zinc-900 rounded px-4 py-2 font-semibold">Post</button>
</form>
