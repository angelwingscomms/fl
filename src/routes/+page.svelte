<script lang="ts">
	import { reveal, magnet } from '$lib/motion';

	let { data } = $props();

	let scrolly_el = $state<HTMLElement>();
	let step_i = $state(0);
	let scrolly_on = $state(true);

	$effect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			scrolly_on = false;
			return;
		}
		let raf = 0;
		let live = true;
		function tick() {
			if (scrolly_el) {
				const r = scrolly_el.getBoundingClientRect();
				const sp = Math.max(0, Math.min(1, -r.top / (r.height - window.innerHeight)));
				step_i = Math.min(2, Math.floor(sp * 3));
			}
			if (live) raf = requestAnimationFrame(tick);
		}
		function on_visibility() {
			live = !document.hidden;
			cancelAnimationFrame(raf);
			if (live) raf = requestAnimationFrame(tick);
		}
		document.addEventListener('visibilitychange', on_visibility);
		raf = requestAnimationFrame(tick);
		return () => {
			live = false;
			document.removeEventListener('visibilitychange', on_visibility);
			cancelAnimationFrame(raf);
		};
	});

	const steps = [
		{
			n: '01',
			h: 'Say what you can do',
			d: 'write your profile in plain words.'
		},
		{
			n: '02',
			h: 'Post what you need',
			d: 'matches appear instantly, ranked by fit.'
		},
		{
			n: '03',
			h: 'Pay into escrow',
			d: 'money moves only when the work is done.'
		}
	];

	const marquee_list = $derived([...data.f, ...data.f]);
</script>

<div class="bg-fix" aria-hidden="true">
	{#if scrolly_on}
		<video
			src="/hero.mp4"
			poster="/hero.jpg"
			autoplay
			loop
			muted
			playsinline
			preload="auto"
		></video>
	{:else}
		<img src="/hero.jpg" alt="" />
	{/if}
	<div class="scrim"></div>
</div>

<section class="container-wide min-h-[92svh] flex items-center py-16">
	<div class="max-w-2xl">
		<p class="eyebrow mb-5">the anti-marketplace</p>
		<h1>
			<span class="block">
				<span class="word-wrap"><span class="word-in" style="animation-delay:0ms">Work</span></span>
				<span class="word-wrap"
					><span class="word-in" style="animation-delay:80ms">finds</span></span
				>
			</span>
			<span class="block">
				<span class="word-wrap"><span class="word-in" style="animation-delay:160ms">the</span></span>
				<em
					><span class="word-wrap"
						><span class="word-in" style="animation-delay:240ms">worker</span></span
					></em
				>.
			</span>
		</h1>
		<p class="pane mt-7 text-[var(--color-text)]" style="max-width: 38ch;">
			Post a job and it's matched — by meaning, not keywords — to people who can actually do it.
			No bids. No browsing. Escrow until it's done.
		</p>
		<div class="mt-7 flex flex-wrap gap-3">
			<a class="btn-fl" href="/jobs/new" use:magnet>Post a job <span class="arrow">→</span></a>
			<a class="btn-ghost" href="/profile">Write your profile</a>
		</div>
		<p class="eyebrow mt-16 opacity-70">scroll to see how it works</p>
	</div>
</section>

{#if data.f.length >= 4}
	<section class="py-10 border-y border-[var(--color-border)]" style="background: var(--color-canvas);">
		<div class="marquee">
			<div class="marquee-track">
				{#each marquee_list as p, i (i)}
					<a
						class="text-2xl whitespace-nowrap link-fl"
						style="font-family: var(--font-display);"
						href="/u/{p.n}">{p.n}</a
					>
					<span style="color: var(--color-accent);">✳</span>
				{/each}
			</div>
		</div>
	</section>
{/if}

{#if scrolly_on}
	<section bind:this={scrolly_el} style="height: 340vh;">
		<div class="sticky top-0 h-screen flex items-center">
			<div class="container-wide w-full">
				<div class="pane-lg max-w-xl">
					<p class="eyebrow mb-8">how it works</p>
					<div class="beats">
						{#each steps as s, i (s.n)}
							<div class:active={step_i === i} aria-hidden={step_i !== i}>
								<span
									style="font-family: var(--font-display); font-size: clamp(3.5rem, 9vw, 7rem); line-height: 1; color: var(--color-accent); opacity: 0.85;"
									>{s.n}</span
								>
								<h3 class="text-2xl sm:text-3xl mt-3 mb-2" style="font-family: var(--font-display);">
									{s.h}
								</h3>
								<p class="text-[var(--color-text-muted)]">{s.d}</p>
							</div>
						{/each}
					</div>
					<div class="mt-10 flex gap-2" aria-hidden="true">
						{#each steps as s, i (s.n)}
							<span class="tick" class:on={step_i >= i}></span>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>
{:else}
	<section class="py-20" style="background: color-mix(in srgb, var(--color-canvas) 88%, transparent);">
		<div class="container-wide">
			<p class="eyebrow mb-10">how it works</p>
			<div class="space-y-14">
				{#each steps as s, i (s.n)}
					<div
						class="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10"
						use:reveal={{ delay: i * 120 }}
					>
						<span
							style="font-family: var(--font-display); font-size: clamp(3.5rem, 9vw, 7rem); line-height: 1; color: var(--color-accent); opacity: 0.85;"
							>{s.n}</span
						>
						<div>
							<h3 class="text-xl sm:text-2xl mb-1" style="font-family: var(--font-display);">
								{s.h}
							</h3>
							<p class="text-[var(--color-text-muted)]">{s.d}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>
{/if}

{#if data.f.length}
	<section class="py-20" style="background: color-mix(in srgb, var(--color-canvas) 88%, transparent);">
		<div class="container-wide">
			<p class="eyebrow mb-10">freelancers on fl</p>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.f as p, i (p.n)}
					<a
						class="card-fl interactive p-5 flex gap-3 items-start"
						href="/u/{p.n}"
						data-cursor="View"
						use:reveal={{ delay: (i % 6) * 70 }}
					>
						{#if p.a}
							<img src="/i/{p.a}" alt="" class="avatar avatar-48" />
						{:else}
							<span class="avatar avatar-48">{p.n[0]}</span>
						{/if}
						<div class="min-w-0">
							<h3 class="font-semibold" style="font-family: var(--font-sans);">{p.n}</h3>
							<p class="text-sm text-[var(--color-text-muted)] line-clamp-2">{p.t}</p>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	.bg-fix {
		position: fixed;
		inset: 0;
		z-index: -1;
	}
	.bg-fix video,
	.bg-fix img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to bottom,
			color-mix(in srgb, var(--color-canvas) 88%, transparent),
			color-mix(in srgb, var(--color-canvas) 52%, transparent) 28%,
			color-mix(in srgb, var(--color-canvas) 52%, transparent) 72%,
			color-mix(in srgb, var(--color-canvas) 92%, transparent)
		);
	}
	.pane,
	.pane-lg {
		background: color-mix(in srgb, var(--color-canvas) 68%, transparent);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
		border-radius: var(--radius-lg);
	}
	.pane {
		padding: 1rem 1.25rem;
	}
	.pane-lg {
		padding: 2.5rem;
	}
	.beats {
		display: grid;
	}
	.beats > div {
		grid-area: 1 / 1;
		opacity: 0;
		transform: translateY(16px);
		transition:
			opacity 0.45s var(--ease),
			transform 0.45s var(--ease);
	}
	.beats > div.active {
		opacity: 1;
		transform: none;
	}
	.tick {
		width: 2.5rem;
		height: 2px;
		background: var(--color-border);
		transition: background 0.3s var(--ease);
	}
	.tick.on {
		background: var(--color-accent);
	}
</style>
