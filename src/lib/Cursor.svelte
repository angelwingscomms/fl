<script lang="ts">
	let dot_x = $state(0);
	let dot_y = $state(0);
	let ring_x = $state(0);
	let ring_y = $state(0);
	let active = $state(false);
	let big = $state(false);
	let label = $state('');

	let raf = 0;
	let mx = 0;
	let my = 0;

	function on_move(e: PointerEvent) {
		mx = e.clientX;
		my = e.clientY;
		dot_x = mx;
		dot_y = my;
		const t = e.target as HTMLElement;
		const el = t?.closest?.('[data-cursor]') as HTMLElement | null;
		if (el) {
			big = true;
			label = el.dataset.cursor ?? '';
		} else {
			big = false;
			label = '';
		}
	}

	function loop() {
		ring_x += (mx - ring_x) * 0.18;
		ring_y += (my - ring_y) * 0.18;
		raf = requestAnimationFrame(loop);
	}

	$effect(() => {
		if (typeof matchMedia === 'undefined') return;
		const fine = matchMedia('(pointer: fine)').matches;
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!fine || reduced) return;
		active = true;
		document.documentElement.classList.add('cursor-none');
		window.addEventListener('pointermove', on_move, { passive: true });
		raf = requestAnimationFrame(loop);
		return () => {
			document.documentElement.classList.remove('cursor-none');
			window.removeEventListener('pointermove', on_move);
			cancelAnimationFrame(raf);
		};
	});
</script>

{#if active}
	<div
		class="cursor-dot"
		style="transform: translate({dot_x}px, {dot_y}px) translate(-50%, -50%)"
	></div>
	<div
		class="cursor-ring"
		class:big
		style="transform: translate({ring_x}px, {ring_y}px) translate(-50%, -50%)"
	>
		{#if big}<span class="cursor-label">{label}</span>{/if}
	</div>
{/if}

<style>
	:global(html.cursor-none),
	:global(html.cursor-none *) {
		cursor: none !important;
	}

	.cursor-dot {
		position: fixed;
		top: 0;
		left: 0;
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: var(--color-accent);
		mix-blend-mode: difference;
		pointer-events: none;
		z-index: 1000;
		will-change: transform;
	}

	.cursor-ring {
		position: fixed;
		top: 0;
		left: 0;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		border: 1px solid var(--color-accent);
		pointer-events: none;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			width 0.25s var(--ease),
			height 0.25s var(--ease),
			background 0.25s var(--ease);
		will-change: transform;
	}

	.cursor-ring.big {
		width: 64px;
		height: 64px;
		background: var(--color-accent);
	}

	.cursor-label {
		font-size: 0.65rem;
		font-family: var(--font-sans);
		color: var(--color-surface);
		white-space: nowrap;
	}
</style>
