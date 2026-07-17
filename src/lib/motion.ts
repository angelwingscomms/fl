function reduced_motion(): boolean {
	return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function reveal(node: HTMLElement, opts: { delay?: number; y?: number } = {}) {
	node.classList.add('reveal');
	if (opts.delay) node.style.transitionDelay = `${opts.delay}ms`;
	if (reduced_motion()) {
		node.classList.add('in');
		return {};
	}
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					node.classList.add('in');
					io.unobserve(node);
				}
			}
		},
		{ threshold: 0.15 }
	);
	io.observe(node);
	return {
		destroy() {
			io.disconnect();
		}
	};
}

export function magnet(node: HTMLElement, strength = 0.25) {
	if (typeof matchMedia === 'undefined' || !matchMedia('(pointer: fine)').matches || reduced_motion()) {
		return {};
	}
	function on_move(e: PointerEvent) {
		const r = node.getBoundingClientRect();
		const x = (e.clientX - (r.left + r.width / 2)) * strength;
		const y = (e.clientY - (r.top + r.height / 2)) * strength;
		node.style.transform = `translate(${x}px, ${y}px)`;
	}
	function on_leave() {
		node.style.transform = '';
	}
	node.style.transition = `transform 0.25s var(--ease)`;
	node.addEventListener('pointermove', on_move);
	node.addEventListener('pointerleave', on_leave);
	return {
		destroy() {
			node.removeEventListener('pointermove', on_move);
			node.removeEventListener('pointerleave', on_leave);
		}
	};
}

export function counter(node: HTMLElement, opts: { to: number; suffix?: string; dur?: number }) {
	const suffix = opts.suffix ?? '';
	const dur = opts.dur ?? 1200;
	function set(v: number) {
		node.textContent = `${Math.round(v)}${suffix}`;
	}
	if (reduced_motion()) {
		set(opts.to);
		return {};
	}
	set(0);
	let raf = 0;
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					io.unobserve(node);
					const start = performance.now();
					function tick(now: number) {
						const t = Math.min(1, (now - start) / dur);
						const eased = 1 - Math.pow(1 - t, 3);
						set(eased * opts.to);
						if (t < 1) raf = requestAnimationFrame(tick);
					}
					raf = requestAnimationFrame(tick);
				}
			}
		},
		{ threshold: 0.4 }
	);
	io.observe(node);
	return {
		destroy() {
			io.disconnect();
			cancelAnimationFrame(raf);
		}
	};
}
