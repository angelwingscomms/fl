<script lang="ts">
	let { data, form } = $props();
	let p = $derived(data.profile ?? { handle: '', t: '', l: '', i: '' });

	type Row = { id: string; v: string };
	const to_rows = (s: string): Row[] => {
		const a = s
			.split('\n')
			.map((x) => x.trim())
			.filter(Boolean);
		return a.length
			? a.map((v) => ({ id: crypto.randomUUID(), v }))
			: [{ id: crypto.randomUUID(), v: '' }];
	};
	let links = $state<Row[]>(to_rows(p.l));
	let images = $state<Row[]>(to_rows(p.i));

	const add = (arr: Row[]) => [...arr, { id: crypto.randomUUID(), v: '' }];
	const rm = (arr: Row[], id: string) => arr.filter((x) => x.id !== id);
</script>

<h1 class="text-3xl font-bold mb-6">{p.handle ? 'Edit' : 'Create'} your profile</h1>

{#if form?.error}<p class="mb-4 text-[var(--color-accent)]">{form.error}</p>{/if}

<form method="POST" class="card-fl space-y-7 p-6 max-w-xl">
	<label class="block space-y-1.5">
		<span class="eyebrow">Handle</span>
		<input name="handle" value={p.handle} class="field-fl" required />
	</label>

	<label class="block space-y-1.5">
		<span class="eyebrow">About</span>
		<textarea name="t" rows="8" class="field-fl">{p.t}</textarea>
	</label>

	<div class="space-y-2">
		<span class="eyebrow">Links</span>
		{#each links as link (link.id)}
			<div class="flex items-center gap-2">
				<input name="l" bind:value={link.v} class="field-fl" placeholder="https://…" />
				<button
					type="button"
					class="icon-btn"
					aria-label="Remove link"
					onclick={() => (links = rm(links, link.id))}>×</button
				>
			</div>
		{/each}
		<button type="button" class="add-row" onclick={() => (links = add(links))}>+ Add link</button>
	</div>

	<div class="space-y-2">
		<span class="eyebrow">Images</span>
		{#each images as img (img.id)}
			<div class="flex items-center gap-2">
				<input name="i" bind:value={img.v} class="field-fl" placeholder="https://…image" />
				<button
					type="button"
					class="icon-btn"
					aria-label="Remove image"
					onclick={() => (images = rm(images, img.id))}>×</button
				>
			</div>
		{/each}
		<button type="button" class="add-row" onclick={() => (images = add(images))}>+ Add image</button
		>
	</div>

	<button class="btn-fl">Save</button>
</form>
