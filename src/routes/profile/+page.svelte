<script lang="ts">
	let { data, form } = $props();
	let p = $derived(data.p ?? { n: '', t: '', l: '', b: 0, a: '', i: [] });

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

	const add = (arr: Row[]) => [...arr, { id: crypto.randomUUID(), v: '' }];
	const rm = (arr: Row[], id: string) => arr.filter((x) => x.id !== id);

	let avatar_key = $state(p.a ?? '');
	let portfolio_keys = $state<string[]>(p.i ?? []);
	let uploading = $state(false);

	async function upload(file: File): Promise<string | null> {
		const fd = new FormData();
		fd.append('f', file);
		const r = await fetch('/api/img', { method: 'POST', body: fd });
		if (!r.ok) return null;
		return ((await r.json()) as { k: string }).k;
	}

	async function on_avatar_change(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		uploading = true;
		const k = await upload(file);
		if (k) avatar_key = k;
		uploading = false;
	}

	async function on_portfolio_change(e: Event) {
		const files = (e.target as HTMLInputElement).files;
		if (!files?.length) return;
		uploading = true;
		for (const file of files) {
			const k = await upload(file);
			if (k) portfolio_keys = [...portfolio_keys, k];
		}
		uploading = false;
	}
</script>

<h1 class="text-3xl font-bold mb-6">{p.n ? 'Edit' : 'Create'} your profile</h1>

{#if form?.error}<p class="mb-4 text-[var(--color-accent)]">{form.error}</p>{/if}

{#if p.b > 0}
	<p class="mb-4 text-sm text-[var(--color-text-muted)]">
		Balance: ₦{(p.b / 100).toLocaleString()} — payouts are manual for now, contact us.
	</p>
{/if}

<form method="POST" class="card-fl profile-card space-y-7 p-6 max-w-xl">
	<label class="block space-y-1.5">
		<span class="eyebrow">Handle</span>
		<input name="n" value={p.n} class="field-fl" required pattern={'[a-z0-9-]{2,30}'} />
	</label>

	<label class="block space-y-1.5">
		<span class="eyebrow">About</span>
		<textarea name="t" rows="8" class="field-fl">{p.t}</textarea>
	</label>

	<div class="space-y-2">
		<span class="eyebrow">Avatar</span>
		{#if avatar_key}
			<img src="/i/{avatar_key}" alt="" class="w-20 h-20 rounded-full object-cover" />
		{/if}
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp,image/avif"
			onchange={on_avatar_change}
		/>
		<input type="hidden" name="a" value={avatar_key} />
	</div>

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
		<span class="eyebrow">Portfolio images</span>
		{#if portfolio_keys.length}
			<div class="grid grid-cols-4 gap-2">
				{#each portfolio_keys as k (k)}
					<img
						src="/i/{k}"
						alt=""
						class="aspect-square w-full object-cover rounded-[var(--radius-xl)] border border-[var(--color-border)]"
					/>
					<input type="hidden" name="i" value={k} />
				{/each}
			</div>
		{/if}
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp,image/avif"
			multiple
			onchange={on_portfolio_change}
		/>
	</div>

	<button class="btn-fl" disabled={uploading}>Save</button>
</form>
