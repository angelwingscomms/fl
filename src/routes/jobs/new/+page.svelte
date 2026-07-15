<script lang="ts">
	let { form } = $props();
</script>

<h1 class="text-3xl font-bold mb-6">Post a job</h1>
{#if form?.error}<p class="mb-4 text-[var(--color-accent)]">{form.error}</p>{/if}

<form method="POST" class="space-y-5 max-w-xl">
	<label class="block space-y-1.5">
		<span class="eyebrow">Title</span>
		<input name="title" class="field-fl" required />
	</label>
	<label class="block space-y-1.5">
		<span class="eyebrow">Description</span>
		<textarea name="description" rows="8" class="field-fl"></textarea>
	</label>
	<button class="btn-fl">Post</button>
</form>
