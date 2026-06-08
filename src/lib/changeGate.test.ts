import { expect, test } from "bun:test";
import { ChangeGate } from "./changeGate";

const flat = (v: number, n = 16) => Float32Array.from({ length: n }, () => v);

test("sends the first frame unconditionally", () => {
  const g = new ChangeGate({ threshold: 8, minIntervalMs: 1000 });
  expect(g.shouldSend(flat(100), 0)).toBe(true);
});

test("suppresses a near-identical next frame", () => {
  const g = new ChangeGate({ threshold: 8, minIntervalMs: 1000 });
  g.shouldSend(flat(100), 0);
  expect(g.shouldSend(flat(101), 1500)).toBe(false);
});

test("sends when change exceeds threshold and interval passed", () => {
  const g = new ChangeGate({ threshold: 8, minIntervalMs: 1000 });
  g.shouldSend(flat(100), 0);
  expect(g.shouldSend(flat(140), 1500)).toBe(true);
});

test("rate-limits even on a big change", () => {
  const g = new ChangeGate({ threshold: 8, minIntervalMs: 1000 });
  g.shouldSend(flat(100), 0);
  expect(g.shouldSend(flat(200), 500)).toBe(false);
});
