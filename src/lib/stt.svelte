<script lang="ts">
	import { start_recording, transcribe_pcm } from '$lib/whistle';
	// Press mic to record 16kHz mono PCM, press again to stop and transcribe
	// in the browser with Cactus Whistle (whistle.ts), then paste into the bound textarea.
	interface Props {
		value?: string;
		ontext?: (s: string) => void;
	}
	let { value = $bindable(''), ontext }: Props = $props();

	let recording = $state(false);
	let busy = $state(false);
	let err = $state('');
	let status = $state('');

	let rec: { stop: () => Promise<Float32Array> } | undefined;

	async function start() {
		err = '';
		try {
			rec = await start_recording();
			recording = true;
			status = 'listening…';
		} catch (e) {
			err = 'mic blocked: ' + (e as Error).message;
		}
	}

	async function paste(pcm: Float32Array) {
		if (!pcm.length) {
			status = '';
			return;
		}
		try {
			const text = (await transcribe_pcm(pcm)).trim();
			if (!text) {
				status = 'no speech detected';
				return;
			}
			const next = value
				? value + (value.endsWith(' ') || value.endsWith('\n') ? '' : ' ') + text
				: text;
			value = next;
			ontext?.(next);
			status = 'done';
		} catch (e) {
			err = (e as Error).message;
		} finally {
			busy = false;
			setTimeout(() => (status = ''), 1200);
		}
	}

	async function toggle() {
		if (busy) return;
		if (recording) {
			busy = true;
			recording = false;
			status = 'transcribing…';
			await paste(await rec!.stop());
		} else {
			await start();
		}
	}
</script>

<span class="stt-wrap">
	<button
		type="button"
		class="icon-btn stt-mic"
		class:rec={recording}
		aria-label="Dictate with microphone"
		onclick={toggle}
		disabled={busy}
		title="Dictate (speak, then press again)"
	>
		{#if recording}●{:else}🎙{/if}
	</button>
	{#if status}<span class="stt-status">{status}</span>{/if}
	{#if err}<span class="stt-err">{err}</span>{/if}
</span>

<style>
	.stt-wrap {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.stt-mic.rec {
		color: var(--color-accent);
		border-color: var(--color-accent);
		animation: pulse 1.2s infinite;
	}
	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent) 40%, transparent);
		}
		50% {
			box-shadow: 0 0 0 6px transparent;
		}
	}
	.stt-status {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
	.stt-err {
		font-size: 0.8rem;
		color: var(--color-accent);
	}
</style>
