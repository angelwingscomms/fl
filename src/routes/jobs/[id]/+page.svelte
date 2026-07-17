<script lang="ts">
	let { data } = $props();

	const labels: Record<string, string> = { o: 'open', h: 'hired', f: 'in escrow', r: 'released' };

	let release_armed = $state(false);
	let k_naira = $state('');
	let funding = $state(false);
	let fund_error = $state('');

	async function fund_escrow() {
		const kobo = Math.round(parseFloat(k_naira) * 100);
		if (!kobo || kobo < 100000) {
			fund_error = 'minimum ₦1,000';
			return;
		}
		funding = true;
		fund_error = '';
		let auth_url = '';
		try {
			const r = await fetch('/api/pay/escrow', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ j: data.j.i, k: kobo })
			});
			const d = (await r.json()) as { u?: string; c?: string; r?: string; error?: string };
			if (!d.c) {
				fund_error = d.error || 'failed to start payment';
				funding = false;
				return;
			}
			auth_url = d.u ?? '';
			const PaystackPop = (await import('@paystack/inline-js')).default as new () => {
				resumeTransaction: (
					code: string,
					cb: {
						onSuccess: (tx: { reference: string }) => void;
						onCancel: () => void;
						onError: () => void;
					}
				) => void;
			};
			const popup = new PaystackPop();
			const fb = setTimeout(() => {
				if (auth_url) window.location.href = auth_url;
			}, 15000);
			popup.resumeTransaction(d.c, {
				onSuccess: (tx) => {
					clearTimeout(fb);
					fetch('/api/pay/verify', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ r: tx.reference })
					})
						.then(() => location.reload())
						.catch(() => location.reload());
				},
				onCancel: () => {
					clearTimeout(fb);
					funding = false;
				},
				onError: () => {
					clearTimeout(fb);
					if (auth_url) window.location.href = auth_url;
				}
			});
		} catch {
			if (auth_url) window.location.href = auth_url;
			else {
				fund_error = 'network error';
				funding = false;
			}
		}
	}
</script>

<div class="flex items-center gap-3 mb-1">
	<h1 class="text-4xl font-bold">{data.j.t}</h1>
	<span class="tag-fl">{labels[data.j.y] ?? data.j.y}</span>
</div>

<pre class="card-fl whitespace-pre-wrap p-5 text-sm font-sans leading-relaxed mb-8">{data.j.d}</pre>

{#if data.o}
	{#if data.j.y === 'o'}
		<h2 class="eyebrow mb-4">Matches</h2>
		{#if data.m.length}
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each data.m as m (m.i)}
					<li class="card-fl p-4">
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								{#if m.a}
									<img src="/i/{m.a}" alt="" class="w-8 h-8 rounded-full object-cover" />
								{:else}
									<span
										class="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] uppercase font-bold text-xs"
										>{m.n[0]}</span
									>
								{/if}
								<a class="font-semibold hover:!text-[var(--color-accent)]" href="/u/{m.n}"
									>{m.n}</a
								>
							</div>
							<span class="text-xl font-bold">{m.sc}%</span>
						</div>
						<p class="text-sm text-[var(--color-text-muted)] mt-2 line-clamp-3">{m.t}</p>
						<div class="flex gap-2 mt-3">
							<a class="btn-fl !py-1.5 !px-3 !text-xs" href="/jobs/{data.j.i}/chat/{m.i}"
								>Chat</a
							>
							<form method="POST" action="?/hire">
								<input type="hidden" name="f" value={m.i} />
								<button class="btn-fl !py-1.5 !px-3 !text-xs">Hire</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-[var(--color-text-muted)]">
				No matching freelancers yet. Ask people to write a profile.
			</p>
		{/if}
	{:else if data.j.y === 'h'}
		<div class="card-fl p-5 mb-6">
			<p class="mb-4">
				Hired <a class="font-semibold hover:!text-[var(--color-accent)]" href="/u/{data.fn}"
					>{data.fn}</a
				>. Fund escrow to get started.
			</p>
			<div class="flex gap-2 items-end flex-wrap">
				<label class="space-y-1.5">
					<span class="eyebrow">Amount (₦)</span>
					<input type="number" min="1000" bind:value={k_naira} class="field-fl" />
				</label>
				<button class="btn-fl" disabled={funding} onclick={fund_escrow}>
					{funding ? 'Processing…' : 'Fund escrow'}
				</button>
			</div>
			{#if fund_error}<p class="text-[var(--color-accent)] text-sm mt-2">{fund_error}</p>{/if}
			<div class="flex gap-2 mt-4">
				<a class="btn-fl !py-1.5 !px-3 !text-xs" href="/jobs/{data.j.i}/chat/{data.j.f}">Chat</a>
				<form method="POST" action="?/unhire">
					<button class="btn-fl !py-1.5 !px-3 !text-xs">Unhire</button>
				</form>
			</div>
		</div>
	{:else if data.j.y === 'f'}
		<div class="card-fl p-5 mb-6">
			<p class="mb-4">In escrow: ₦{((data.j.e ?? 0) / 100).toLocaleString()}</p>
			<div class="flex gap-2">
				<a class="btn-fl !py-1.5 !px-3 !text-xs" href="/jobs/{data.j.i}/chat/{data.j.f}">Chat</a>
				<form
					method="POST"
					action="?/release"
					onsubmit={(e) => {
						if (!release_armed) {
							e.preventDefault();
							release_armed = true;
						}
					}}
				>
					<button class="btn-fl">
						{release_armed
							? `Really release ₦${((data.j.e ?? 0) / 100).toLocaleString()}?`
							: 'Release payment'}
					</button>
				</form>
			</div>
		</div>
	{:else if data.j.y === 'r'}
		<p class="text-[var(--color-good,var(--color-accent))]">Released — payment complete.</p>
	{/if}
{:else}
	<a class="btn-fl" href="/jobs/{data.j.i}/chat/{data.u}">Chat with client</a>
{/if}
