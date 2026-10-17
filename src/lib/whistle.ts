// Cactus Whistle runs in a module worker from static/whistle (ONNX, WebGPU or WASM).
const SR = 16000;

type job = { resolve: (text: string) => void; reject: (err: Error) => void };

let worker: Worker | null = null;
let seq = 0;
const jobs = new Map<number, job>();

function fail_all(err: Error) {
	for (const job of jobs.values()) job.reject(err);
	jobs.clear();
	worker?.terminate();
	worker = null;
}

function get_worker(): Worker {
	if (worker) return worker;
	const w = new Worker('/whistle/worker.js', { type: 'module' });
	w.postMessage({ type: 'init', cfg: {} });
	w.onmessage = ({ data }) => {
		if (data.type === 'result') {
			jobs.get(data.id)?.resolve(data.result.text);
			jobs.delete(data.id);
		} else if (data.type === 'error') {
			if (data.id === undefined) return fail_all(new Error(data.text));
			jobs.get(data.id)?.reject(new Error(data.text));
			jobs.delete(data.id);
		}
	};
	w.onerror = (e) => fail_all(new Error(e.message));
	worker = w;
	return w;
}

function resample(x: Float32Array, from: number): Float32Array {
	const ratio = from / SR;
	const len = Math.floor(x.length / ratio);
	const y = new Float32Array(len);
	for (let i = 0; i < len; i++) {
		const p = i * ratio;
		const i0 = Math.floor(p);
		const f = p - i0;
		y[i] = x[i0] * (1 - f) + (x[i0 + 1] ?? x[i0]) * f;
	}
	return y;
}

function join(chunks: Float32Array[]): Float32Array {
	const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
	let o = 0;
	for (const c of chunks) {
		all.set(c, o);
		o += c.length;
	}
	return all;
}

export async function transcribe_pcm(pcm: Float32Array): Promise<string> {
	const id = ++seq;
	const copy = pcm.slice();
	return new Promise<string>((resolve, reject) => {
		jobs.set(id, { resolve, reject });
		get_worker().postMessage(
			{
				type: 'transcribe',
				id,
				partial: false,
				pcm: copy,
				language: null,
				keywords: null,
				timestamps: false
			},
			[copy.buffer]
		);
	});
}

export async function start_recording(
	max_seconds = 30
): Promise<{ stop: () => Promise<Float32Array> }> {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
	});
	let ctx: AudioContext;
	try {
		ctx = new AudioContext({ sampleRate: SR });
	} catch {
		ctx = new AudioContext();
	}
	const rate = ctx.sampleRate;
	const source = ctx.createMediaStreamSource(stream);
	const proc = ctx.createScriptProcessor(4096, 1, 1);
	const chunks: Float32Array[] = [];
	proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
	source.connect(proc);
	proc.connect(ctx.destination);

	let stopped: Promise<Float32Array> | undefined;
	const finish = async (): Promise<Float32Array> => {
		clearTimeout(timer);
		proc.disconnect();
		source.disconnect();
		stream.getTracks().forEach((t) => t.stop());
		await ctx.close();
		const all = join(chunks);
		return rate === SR ? all : resample(all, rate);
	};
	const stop = () => (stopped ??= finish());
	const timer = setTimeout(stop, max_seconds * 1000);
	return { stop };
}
