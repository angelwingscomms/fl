<script lang="ts">
	import { reveal, magnet } from '$lib/motion';
	let { form } = $props();
</script>

<section class="container-fl py-16">
	<p class="eyebrow mb-3">say what you need</p>
	<h1 class="text-2xl sm:text-3xl mb-8" style="font-family: var(--font-display);">
		post a <em>job</em>
	</h1>

	{#if form?.error}<p class="mb-4 text-[var(--color-accent)]">{form.error}</p>{/if}

	<form method="POST" class="card-fl space-y-5 p-6 sm:p-8" use:reveal>
		<label class="block space-y-1.5">
			<span class="eyebrow">title</span>
			<input name="t" class="field-fl" required />
		</label>
		<label class="block space-y-1.5">
			<span class="eyebrow">description</span>
			<textarea name="d" rows="8" class="field-fl"></textarea>
		</label>
		<button class="btn-fl" use:magnet>post <span class="arrow">→</span></button>
	</form>
</section>
