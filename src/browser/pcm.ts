export function b64ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const n = bin.length / 2;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
    if (s >= 32768) s -= 65536;
    out[i] = s / 32768;
  }
  return out;
}

export function rms(f: Float32Array): number {
  if (!f.length) return 0;
  let sum = 0;
  for (let i = 0; i < f.length; i++) sum += f[i] * f[i];
  return Math.sqrt(sum / f.length);
}
