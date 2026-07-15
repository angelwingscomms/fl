<script lang="ts">
	let { data, form } = $props();
	let p = $derived(data.profile ?? { handle: '', t: '', l: '', i: '' });
</script>

<h1 class="text-3xl font-bold mb-6">
	<span class="gradient-text">{p.handle ? 'Edit' : 'Create'} your profile</span>
</h1>

{#if form?.error}<p class="mb-4 text-[var(--color-accent)]">{form.error}</p>{/if}

<form method="POST" class="space-y-5 max-w-xl">
	<label class="block space-y-1.5">
		<span class="eyebrow">Handle</span>
		<input name="handle" value={p.handle} class="field-fl" required />
	</label>
	<label class="block space-y-1.5">
		<span class="eyebrow">About (t) — everything about you</span>
		<textarea name="t" rows="8" class="field-fl">{p.t}</textarea>
	</label>
	<label class="block space-y-1.5">
		<span class="eyebrow">Links (l) — one per line</span>
		<textarea name="l" rows="3" class="field-fl">{p.l}</textarea>
	</label>
	<label class="block space-y-1.5">
		<span class="eyebrow">Image URLs (i) — one per line</span>
		<textarea name="i" rows="3" class="field-fl">{p.i}</textarea>
	</label>
	<button class="btn-fl">Save</button>
</form>
