// Whistle in a module worker: onnxruntime-web (WebGPU, WASM fallback) + host-side
// mel / engram / decoding in JS. Weights come from one compact pack (~17 MB) that is
// expanded in the browser into the ONNX external-data buffers.
import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.webgpu.min.mjs';
import { parsePack, buildModelData } from './pack.js';
import { Tokenizer, Engram, transcribe } from './whistle.js';
import { OrtBackend } from './backend.js';

ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 4) : 1;

const VERSION = 'v1';
const CACHE = 'whistle-onnx-' + VERSION;
const PACK_URL = new URL('whistle.pack', import.meta.url).href;
const graphUrl = (n) => new URL(`onnx/${n}.onnx`, import.meta.url).href;

let backend = null, ctx = null, info = {};
const post = (m) => postMessage(m);

// ---- downloads: Cache API, parallel range requests, byte progress
const prog = { loaded: 0, total: 0, files: 0, cached: 0 };
const report = () => post({ type: 'progress', loaded: prog.loaded, total: prog.total, cached: prog.cached });

async function cached(url) {
  try { const c = await caches.open(CACHE); const r = await c.match(url); return r ? new Uint8Array(await r.arrayBuffer()) : null; }
  catch (_) { return null; }
}
async function store(url, data) {
  try { const c = await caches.open(CACHE); await c.put(url, new Response(data, { headers: { 'content-length': String(data.length) } })); } catch (_) {}
}
async function readBody(res, dst, off) {
  const rd = res.body.getReader(); let o = off;
  for (;;) {
    const { done, value } = await rd.read(); if (done) break;
    dst.set(value, o); o += value.length; prog.loaded += value.length; report();
  }
  return o - off;
}
async function streamAll(res, size) {
  const chunks = []; let n = 0; const rd = res.body.getReader();
  for (;;) { const { done, value } = await rd.read(); if (done) break; chunks.push(value); n += value.length; prog.loaded += value.length; report(); }
  const out = new Uint8Array(n); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out;
}
// Parallel ranged GET: first range reveals the size, the rest is fetched concurrently.
async function fetchFile(url, expect, parts = 6) {
  const hit = await cached(url);
  if (hit) { prog.cached += hit.length; prog.loaded += hit.length; prog.total += hit.length - (expect || 0); report(); return hit; }
  const CH = Math.max(1 << 20, Math.ceil((expect || 0) / parts));
  const first = await fetch(url, { headers: { Range: `bytes=0-${CH - 1}` } });
  if (!first.ok) throw new Error(`download failed: ${url} HTTP ${first.status}`);
  let data;
  const cr = first.headers.get('content-range');
  if (first.status === 206 && cr) {
    const total = Number(cr.split('/')[1]);
    prog.total += total - (expect || 0); report();
    data = new Uint8Array(total);
    const jobs = [readBody(first, data, 0)];
    for (let s = CH; s < total; s += CH) {
      const e = Math.min(total, s + CH) - 1;
      jobs.push(fetch(url, { headers: { Range: `bytes=${s}-${e}` } }).then((r) => {
        if (r.status !== 206) throw new Error(`range request failed: HTTP ${r.status}`);
        return readBody(r, data, s);
      }));
    }
    await Promise.all(jobs);
  } else {
    const len = Number(first.headers.get('content-length')) || expect || 0;
    prog.total += len - (expect || 0); report();
    data = await streamAll(first, len);
  }
  store(url, data);
  return data;
}

// ---- model setup
async function hasF16() {
  try { const a = await navigator.gpu.requestAdapter(); return !!a && a.features.has('shader-f16'); } catch (_) { return false; }
}
async function init(cfg) {
  const T0 = performance.now();
  const gpu = !!self.navigator.gpu && !!(await navigator.gpu.requestAdapter().catch(() => null));
  let encEp = cfg.enc || (gpu ? 'webgpu' : 'wasm');
  // the per-token decoder step is latency-bound: WASM beats WebGPU dispatch overhead
  let decEp = cfg.dec || 'wasm';
  if (!gpu) encEp = decEp = 'wasm';
  // fp16 weights only help on the GPU; the WASM path always runs fp32
  const prec = cfg.prec || (encEp === 'webgpu' && (await hasF16()) ? 'fp16' : 'fp32');
  const sfxE = prec === 'fp16' && encEp === 'webgpu' ? '_fp16' : '';
  const sfxD = prec === 'fp16' && decEp === 'webgpu' ? '_fp16' : '';
  info = { gpu, encEp, decEp, prec, threads: ort.env.wasm.numThreads };
  info.encPrec = sfxE ? 'fp16' : 'fp32'; info.decPrec = sfxD ? 'fp16' : 'fp32';
  post({ type: 'status', text: 'Downloading model…' });
  // expected sizes only seed the progress bar; the real sizes replace them
  prog.total = 17.0e6 + 1.0e6 + 0.5e6;
  const [packBuf, encG, decG] = await Promise.all([
    fetchFile(PACK_URL, 17.0e6),
    fetchFile(graphUrl('encoder' + sfxE), 1.0e6, 1),
    fetchFile(graphUrl('decoder' + sfxD), 0.5e6, 1),
  ]);
  const T1 = performance.now();
  post({ type: 'status', text: 'Expanding weights…' });
  const pack = parsePack(packBuf.buffer.slice(packBuf.byteOffset, packBuf.byteOffset + packBuf.length));
  const m = pack.man;
  const fb = new Float32Array(pack.buf.slice(pack.base + m.melfb.src, pack.base + m.melfb.src + 257 * 80 * 4));
  ctx = { tok: new Tokenizer(m.tok), fb, engram: new Engram(pack) };
  const encData = buildModelData(pack, 'encoder' + sfxE);
  const decData = buildModelData(pack, 'decoder' + sfxD);
  const T2 = performance.now();
  post({ type: 'status', text: `Starting ONNX Runtime (${encEp === decEp ? encEp : encEp + ' + ' + decEp})…` });
  const so = (ep, name, data, gpuOut) => ({
    executionProviders: ep === 'webgpu' ? ['webgpu'] : ['wasm'],
    graphOptimizationLevel: 'all',
    externalData: [{ path: `${name}.onnx.data`, data }],
    ...(gpuOut ? { preferredOutputLocation: gpuOut } : {}),
  });
  const both = encEp === 'webgpu' && decEp === 'webgpu';
  // sequential: concurrent creation across EPs stalls in ort-web 1.30
  const enc = await ort.InferenceSession.create(encG, so(encEp, 'encoder' + sfxE, encData,
    both ? { cross_k: 'gpu-buffer', cross_v: 'gpu-buffer' } : null));
  const dec = await ort.InferenceSession.create(decG, so(decEp, 'decoder' + sfxD, decData,
    decEp === 'webgpu' ? { prev_out: 'gpu-buffer', present_k: 'gpu-buffer', present_v: 'gpu-buffer' } : null));
  backend = new OrtBackend(ort, enc, dec, { encGpu: encEp === 'webgpu', decGpu: decEp === 'webgpu' });
  const T3 = performance.now();
  post({ type: 'status', text: 'Warming up…' });
  await transcribe(backend, ctx, warmupAudio(), { language: 'en', maxTokens: 4, timestamps: true });
  const T4 = performance.now();
  info.load = { download_ms: T1 - T0, expand_ms: T2 - T1, session_ms: T3 - T2, warmup_ms: T4 - T3, total_ms: T4 - T0,
    bytes: prog.total, cached_bytes: prog.cached };
  post({ type: 'ready', info });
}
function warmupAudio() {  // 1.5 s of quiet noise so every shader gets compiled once
  const x = new Float32Array(24000); let s = 1;
  for (let i = 0; i < x.length; i++) { s = (s * 16807) % 2147483647; x[i] = (s / 2147483647 - 0.5) * 0.01; }
  return x;
}

let queue = Promise.resolve();
onmessage = ({ data }) => {
  if (data.type === 'init') { queue = init(data.cfg || {}).catch((e) => { post({ type: 'error', text: String(e.message || e) }); throw e; }); return; }
  if (data.type === 'transcribe') {
    queue = queue.then(async () => {
      try {
        const kws = data.keywords ? data.keywords.split('\n').map((s) => s.trim()).filter(Boolean) : [];
        const t0 = performance.now();
        const r = await transcribe(backend, ctx, data.pcm, { language: data.language || null, keywords: kws, timestamps: !!data.timestamps });
        post({ type: 'result', id: data.id, partial: !!data.partial, result: r, ms: performance.now() - t0, info });
      } catch (e) { post({ type: 'error', id: data.id, text: String(e.message || e) }); }
    });
  }
};
