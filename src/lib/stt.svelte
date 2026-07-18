<script lang="ts">
	// Replicates @renjfk/opencode-voice STT behavior in-browser:
	// press mic to record (continuous 16kHz mono PCM, chunked as it grows),
	// press again to stop + transcribe via /api/stt (OpenRouter Parakeet),
	// then normalize + paste into the bound textarea.
	interface Props {
		value?: string;
		ontext?: (s: string) => void;
		context?: string;
	}
	let { value = $bindable(''), ontext, context = '' }: Props = $props();

	let recording = $state(false);
	let busy = $state(false);
	let err = $state('');
	let status = $state('');

	let ctx: AudioContext | null = null;
	let stream: MediaStream | null = null;
	let proc: ScriptProcessorNode | null = null;
	let chunks: Float32Array[] = [];
	let sampleRate = 16000;

	function encodeWav(samples: Float32Array, rate: number): string {
		const buf = new ArrayBuffer(44 + samples.length * 2);
		const dv = new DataView(buf);
		const ws = (o: number, s: string) => {
			for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i));
		};
		ws(0, 'RIFF');
		dv.setUint32(4, 36 + samples.length * 2, true);
		ws(8, 'WAVE');
		ws(12, 'fmt ');
		dv.setUint32(16, 16, true);
		dv.setUint16(20, 1, true);
		dv.setUint16(22, 1, true);
		dv.setUint32(24, rate, true);
		dv.setUint32(28, rate * 2, true);
		dv.setUint16(32, 2, true);
		dv.setUint16(34, 16, true);
		ws(36, 'data');
		dv.setUint32(40, samples.length * 2, true);
		let o = 44;
		for (let i = 0; i < samples.length; i++) {
			let s = Math.max(-1, Math.min(1, samples[i]));
			dv.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
			o += 2;
		}
		let bin = '';
		const bytes = new Uint8Array(buf);
		for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
		return btoa(bin);
	}

	async function start() {
		err = '';
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			ctx = new AudioContext({ sampleRate });
			const src = ctx.createMediaStreamSource(stream);
			proc = ctx.createScriptProcessor(4096, 1, 1);
			chunks = [];
			proc.onaudioprocess = (e) => {
				// chunked capture: append each buffer so extended speech keeps growing
				chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
			};
			src.connect(proc);
			proc.connect(ctx.destination);
			recording = true;
			status = 'listening…';
		} catch (e) {
			err = 'mic blocked: ' + (e as Error).message;
		}
	}

	function stop() {
		recording = false;
		status = 'transcribing…';
		proc?.disconnect();
		proc = null;
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
		ctx?.close();
		ctx = null;
	}

	async function transcribeAndPaste() {
		const total = chunks.reduce((n, c) => n + c.length, 0);
		if (!total) {
			status = '';
			return;
		}
		const all = new Float32Array(total);
		let o = 0;
		for (const c of chunks) {
			all.set(c, o);
			o += c.length;
		}
		const wav = encodeWav(all, sampleRate);
		chunks = [];
		try {
			const r = await fetch('/api/stt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audio: wav, context })
			});
			if (!r.ok) {
				const j = await r.json().catch(() => ({}));
				throw new Error(j.message || `STT ${r.status}`);
			}
			const { text } = (await r.json()) as { text: string };
			if (!text) {
				status = 'no speech detected';
				return;
			}
			const next = value ? value + (value.endsWith(' ') || value.endsWith('\n') ? '' : ' ') + text : text;
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
			stop();
			await transcribeAndPaste();
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
