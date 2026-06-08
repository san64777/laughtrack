import { expect, test } from "bun:test";
import { b64ToFloat32, rms } from "./pcm";

test("decodes a known 16-bit LE sample", () => {
  const b64 = btoa(String.fromCharCode(0x00, 0x80, 0xff, 0x7f));
  const f = b64ToFloat32(b64);
  expect(f.length).toBe(2);
  expect(f[0]).toBeCloseTo(-1, 2);
  expect(f[1]).toBeCloseTo(1, 2);
});

test("rms of silence is 0", () => {
  expect(rms(new Float32Array(8))).toBe(0);
});
