import type { Emotion } from "./types";

const RULES: Array<[Emotion, RegExp]> = [
  ["applause", /\b(bravo|clap|encore|applau)/i],
  ["laugh", /\b(ha+|lol|lmao|hehe|haha)/i],
  ["boo", /\b(boo+|yikes|nope|ouch|cringe|try again|oof)/i],
  ["gasp", /\b(gasp|whoa|woah|no way|omg|what)/i],
  ["cheer", /\b(yes+|woo+|let'?s go|nice|yeah|bravo|love it)/i],
];

export function reactionToEmotion(text: string): Emotion {
  const t = text.trim();
  if (!t) return "idle";
  for (const [emotion, re] of RULES) if (re.test(t)) return emotion;
  return "idle";
}
