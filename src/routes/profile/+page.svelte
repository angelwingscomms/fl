<script lang="ts">
	import { untrack } from 'svelte';
	import { reveal, magnet } from '$lib/motion';

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
	let links = $state<Row[]>(untrack(() => to_rows(data.p?.l ?? '')));

	const add = (arr: Row[]) => [...arr, { id: crypto.randomUUID(), v: '' }];
	const rm = (arr: Row[], id: string) => arr.filter((x) => x.id !== id);

	let avatar_key = $state(untrack(() => data.p?.a ?? ''));
	let portfolio_keys = $state<string[]>(untrack(() => data.p?.i ?? []));
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

<section class="container-fl py-16">
	<p class="eyebrow mb-3">your desk</p>
	<h1 class="text-2xl sm:text-3xl mb-8" style="font-family: var(--font-display);">
		{p.n ? 'edit' : 'write'} your <em>profile</em>
	</h1>

	{#if form?.error}<p class="mb-4 text-[var(--color-accent)]">{form.error}</p>{/if}

	{#if p.b > 0}
		<p class="mb-6 text-sm text-[var(--color-text-muted)]">
			balance: ₦{(p.b / 100).toLocaleString()} — payouts are manual for now, contact us.
		</p>
	{/if}

	<form method="POST" class="card-fl space-y-7 p-6 sm:p-8" use:reveal>
		<label class="block space-y-1.5">
			<span class="eyebrow">handle</span>
			<input name="n" value={p.n} class="field-fl" required pattern={'[a-z0-9-]{2,30}'} />
		</label>

		<label class="block space-y-1.5">
			<span class="eyebrow">about — what can you do?</span>
			<textarea name="t" rows="8" class="field-fl">{p.t}</textarea>
		</label>

		<div class="space-y-2">
			<span class="eyebrow">avatar</span>
			{#if avatar_key}
				<img src="/i/{avatar_key}" alt="" class="avatar avatar-96" />
			{/if}
			<input
				type="file"
				accept="image/jpeg,image/png,image/webp,image/avif"
				onchange={on_avatar_change}
			/>
			<input type="hidden" name="a" value={avatar_key} />
		</div>

		<div class="space-y-2">
			<span class="eyebrow">links</span>
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
			<button type="button" class="add-row" onclick={() => (links = add(links))}>+ add link</button
			>
		</div>

		<div class="space-y-2">
			<span class="eyebrow">portfolio images</span>
			{#if portfolio_keys.length}
				<div class="grid grid-cols-4 gap-2">
					{#each portfolio_keys as k (k)}
						<img
							src="/i/{k}"
							alt=""
							class="aspect-square w-full object-cover rounded-[var(--radius)] border border-[var(--color-border)]"
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

		<button class="btn-fl" disabled={uploading} use:magnet={0.15}
			>save <span class="arrow">→</span></button
		>
	</form>
</section>
