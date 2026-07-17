<script lang="ts">
	import { reveal, magnet } from '$lib/motion';
	let done = $state(false);
	let j = $state('');
	$effect(() => {
		const q = new URLSearchParams(location.search);
		const reference = q.get('reference');
		j = q.get('j') ?? '';
		if (reference) {
			fetch('/api/pay/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ r: reference })
			})
				.then(() => (done = true))
				.catch(() => (done = true));
		}
	});
</script>

<section class="container-fl py-20 text-center">
	<p class="eyebrow mb-3">escrow</p>
	<h1 class="mb-6">
		{#if done}paid <em>in full</em>.{:else}one <em>moment</em>…{/if}
	</h1>
	<p class="card-fl p-5 mb-8 mx-auto max-w-md" use:reveal>
		{done ? 'payment received — escrow funded.' : 'processing…'}
	</p>
	<a class="btn-fl" href="/jobs/{j}" use:magnet>back to job <span class="arrow">→</span></a>
</section>
