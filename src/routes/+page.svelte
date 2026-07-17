<script lang="ts">
	import { reveal, magnet } from '$lib/motion';

	let { data } = $props();

	let parallax_y = $state(0);

	$effect(() => {
		if (typeof window === 'undefined') return;
		let raf = 0;
		function on_scroll() {
			raf = 0;
			parallax_y = Math.max(-20, Math.min(20, window.scrollY * 0.08));
		}
		function on_scroll_throttled() {
			if (!raf) raf = requestAnimationFrame(on_scroll);
		}
		window.addEventListener('scroll', on_scroll_throttled, { passive: true });
		return () => {
			window.removeEventListener('scroll', on_scroll_throttled);
			cancelAnimationFrame(raf);
		};
	});

	let scrolly_el = $state<HTMLElement>();
	let scrub_el = $state<HTMLVideoElement>();
	let step_i = $state(0);
	let scrolly_on = $state(true);

	$effect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			scrolly_on = false;
			return;
		}
		let raf = 0;
		let live = false;
		let t = 0;
		function tick() {
			if (scrolly_el) {
				const r = scrolly_el.getBoundingClientRect();
				const p = Math.max(0, Math.min(1, -r.top / (r.height - window.innerHeight)));
				step_i = Math.min(2, Math.floor(p * 3));
				const v = scrub_el;
				if (v && v.duration) {
					t += (p * (v.duration - 0.05) - t) * 0.15;
					if (Math.abs(v.currentTime - t) > 0.004) v.currentTime = t;
				}
			}
			if (live) raf = requestAnimationFrame(tick);
		}
		const io = new IntersectionObserver(([e]) => {
			live = e.isIntersecting;
			cancelAnimationFrame(raf);
			if (live) raf = requestAnimationFrame(tick);
		});
		if (scrolly_el) io.observe(scrolly_el);
		return () => {
			io.disconnect();
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

<section class="container-wide min-h-[88svh] grid gap-10 items-center py-16 lg:grid-cols-2">
	<div>
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
		<p class="mt-6 text-[var(--color-text-muted)]" style="max-width: 34ch;">
			Post a job and it's matched — by meaning, not keywords — to people who can actually do it.
			No bids. No browsing. Escrow until it's done.
		</p>
		<div class="mt-8 flex flex-wrap gap-3">
			<a class="btn-fl" href="/jobs/new" use:magnet>Post a job <span class="arrow">→</span></a>
			<a class="btn-ghost" href="/profile">Write your profile</a>
		</div>
	</div>

	<div
		class="relative aspect-[4/5] overflow-hidden"
		style="border-radius: 999px 999px var(--radius-lg) var(--radius-lg); transform: translateY({parallax_y}px);"
	>
		<img src="/hero.jpg" alt="" class="w-full h-full object-cover" />
	</div>
</section>

{#if data.f.length >= 4}
	<section class="py-10 border-y border-[var(--color-border)]">
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
		<div class="sticky top-0 h-screen flex items-center overflow-hidden">
			<div class="container-wide grid gap-8 items-center w-full lg:grid-cols-2 lg:gap-14">
				<div
					class="relative aspect-[4/5] w-full max-w-[44vh] mx-auto lg:max-w-[56vh] lg:mx-0 overflow-hidden"
					style="border-radius: 999px 999px var(--radius-lg) var(--radius-lg);"
				>
					<video
						bind:this={scrub_el}
						class="w-full h-full object-cover"
						src="/hero.mp4"
						poster="/hero.jpg"
						muted
						playsinline
						preload="auto"
					></video>
				</div>
				<div>
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
	<section class="container-wide py-20">
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
						<h3 class="text-xl sm:text-2xl mb-1" style="font-family: var(--font-display);">{s.h}</h3>
						<p class="text-[var(--color-text-muted)]">{s.d}</p>
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}

{#if data.f.length}
	<section class="container-wide py-20">
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
	</section>
{/if}

<style>
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
