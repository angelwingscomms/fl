<script lang="ts">
	import { reveal, magnet, counter } from '$lib/motion';
	let { data } = $props();

	const labels: Record<string, string> = { o: 'open', h: 'hired', f: 'in escrow', r: 'released' };
	const badge: Record<string, string> = { o: 'badge-o', h: 'badge-h', f: 'badge-f', r: 'badge-r' };

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

<section class="container-wide py-16">
	<p class="eyebrow mb-3">the job</p>
	<div class="flex flex-wrap items-center gap-3 mb-6">
		<h1 class="text-3xl sm:text-4xl" style="font-family: var(--font-display);">{data.j.t}</h1>
		<span class="badge-fl {badge[data.j.y] ?? 'badge-o'}">{labels[data.j.y] ?? data.j.y}</span>
	</div>

	<pre class="card-fl whitespace-pre-wrap p-5 text-sm font-sans leading-relaxed mb-10">{data.j.d}</pre>

	{#if data.o}
		{#if data.j.y === 'o'}
			<p class="eyebrow mb-5">matches</p>
			{#if data.m.length}
				<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.m as m, i (m.i)}
						<li class="card-fl p-5" use:reveal={{ delay: (i % 6) * 70 }}>
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 min-w-0">
									{#if m.a}
										<img src="/i/{m.a}" alt="" class="avatar avatar-32" />
									{:else}
										<span class="avatar avatar-32">{m.n[0]}</span>
									{/if}
									<a class="link-fl font-semibold truncate" href="/u/{m.n}">{m.n}</a>
								</div>
								<span
									class="text-xl shrink-0"
									style="font-family: var(--font-display); color: var(--color-accent);"
									use:counter={{ to: m.sc, suffix: '%' }}>0%</span
								>
							</div>
							<p class="text-sm text-[var(--color-text-muted)] mt-2 line-clamp-3">{m.t}</p>
							<div class="flex gap-2 mt-4">
								<a
									class="btn-ghost !py-1.5 !px-3 !text-xs"
									href="/jobs/{data.j.i}/chat/{m.i}"
									data-cursor="Chat">chat</a
								>
								<form method="POST" action="?/hire">
									<input type="hidden" name="f" value={m.i} />
									<button class="btn-fl !py-1.5 !px-3 !text-xs">hire</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-[var(--color-text-muted)]">
					no matching freelancers yet — ask people to write a profile.
				</p>
			{/if}
		{:else if data.j.y === 'h'}
			<div class="card-fl p-6" use:reveal>
				<p class="mb-4">
					hired <a class="link-fl font-semibold" href="/u/{data.fn}">{data.fn}</a>. fund escrow to
					get started.
				</p>
				<div class="flex gap-2 items-end flex-wrap">
					<label class="space-y-1.5">
						<span class="eyebrow">amount (₦)</span>
						<input type="number" min="1000" bind:value={k_naira} class="field-fl" />
					</label>
					<button class="btn-fl" disabled={funding} onclick={fund_escrow} use:magnet={0.15}>
						{funding ? 'processing…' : 'fund escrow'}
					</button>
				</div>
				{#if fund_error}<p class="text-[var(--color-accent)] text-sm mt-2">{fund_error}</p>{/if}
				<div class="flex gap-2 mt-5">
					<a class="btn-ghost !py-1.5 !px-3 !text-xs" href="/jobs/{data.j.i}/chat/{data.j.f}"
						>chat</a
					>
					<form method="POST" action="?/unhire">
						<button class="btn-ghost !py-1.5 !px-3 !text-xs">unhire</button>
					</form>
				</div>
			</div>
		{:else if data.j.y === 'f'}
			<div class="card-fl p-6" use:reveal>
				<p class="mb-4">in escrow: ₦{((data.j.e ?? 0) / 100).toLocaleString()}</p>
				<div class="flex gap-2">
					<a class="btn-ghost !py-1.5 !px-3 !text-xs" href="/jobs/{data.j.i}/chat/{data.j.f}"
						>chat</a
					>
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
								? `really release ₦${((data.j.e ?? 0) / 100).toLocaleString()}?`
								: 'release payment'}
						</button>
					</form>
				</div>
			</div>
		{:else if data.j.y === 'r'}
			<p class="text-[var(--color-good)]" use:reveal>released — payment complete.</p>
		{/if}
	{:else}
		<a class="btn-fl" href="/jobs/{data.j.i}/chat/{data.u}" use:magnet
			>chat with client <span class="arrow">→</span></a
		>
	{/if}
</section>
