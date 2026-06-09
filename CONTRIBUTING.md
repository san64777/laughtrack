# Contributing

laughtrack is a small toy, but fixes and additions are welcome.

- Open an issue first for anything non-trivial, so we can agree on the shape before you build it.
- `bun install`, then keep `bun test` and `bun run typecheck` green. Use `bunx biome check .` for
  format and lint.
- Keep the reaction core (`src/lib`, especially `liveReactor.ts` and `changeGate.ts`) framework-agnostic
  and unit-tested; the browser-only pieces (crowd, audio, recorder, webcam) live under `src/browser`.
- The most useful contributions are sharper persona prompts (the comedy is the taste), new crowds, and
  crowd-art polish.

By contributing, you agree your work is licensed under the MIT License.
