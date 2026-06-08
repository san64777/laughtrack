import { expect, test } from "bun:test";
import { PERSONAS, personaById } from "./personas";

test("exactly the three v1 personas exist", () => {
  expect(PERSONAS.map((p) => p.id).sort()).toEqual(["heckle", "hype", "posh"]);
});

test("each persona is fully specified", () => {
  for (const p of PERSONAS) {
    expect(p.label.length).toBeGreaterThan(0);
    expect(p.systemInstruction).toContain("1 to 3 words");
    expect(p.voiceName.length).toBeGreaterThan(0);
    expect(p.palette.length).toBeGreaterThanOrEqual(4);
  }
});

test("personaById returns the right one", () => {
  expect(personaById("posh").voiceName).toBe("Kore");
});
