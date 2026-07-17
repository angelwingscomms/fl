<script lang="ts">
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

<section class="py-10 max-w-xl mx-auto text-center">
	<h1 class="text-display mb-4">Payment</h1>
	<p class="card-fl p-5 mb-6">
		{done ? 'Payment received — escrow funded.' : 'Processing…'}
	</p>
	<a class="btn-fl" href="/jobs/{j}">Back to job</a>
</section>
