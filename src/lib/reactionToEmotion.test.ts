import { expect, test } from "bun:test";
import { reactionToEmotion } from "./reactionToEmotion";
import type { Emotion } from "./types";

test.each([
  ["Boo!", "boo"],
  ["yikes", "boo"],
  ["Yesss!", "cheer"],
  ["woo, let's go", "cheer"],
  ["whoa, no way", "gasp"],
  ["GASP", "gasp"],
  ["hahaha", "laugh"],
  ["bravo, clap clap", "applause"],
  ["hmm okay", "idle"],
])("'%s' -> %s", (text, expected) => {
  expect(reactionToEmotion(text)).toBe(expected as Emotion);
});
