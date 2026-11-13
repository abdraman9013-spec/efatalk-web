import assert from "node:assert/strict";
import test from "node:test";
import {
  C1_SYNONYMS_STORM,
  dealNextStormWord,
  scoreStormHit,
  startStormRun,
} from "./c1-synonyms-storm.ts";

test("Storm deck has at least 60 unique C1 cards with four options", () => {
  const ids = new Set(C1_SYNONYMS_STORM.map((card) => card.id));
  const words = new Set(C1_SYNONYMS_STORM.map((card) => card.word));
  assert.ok(C1_SYNONYMS_STORM.length >= 60);
  assert.equal(ids.size, C1_SYNONYMS_STORM.length);
  assert.equal(words.size, C1_SYNONYMS_STORM.length);
  for (const card of C1_SYNONYMS_STORM) {
    assert.equal(card.options.length, 4);
    assert.ok(card.correctAnswerIndex >= 0 && card.correctAnswerIndex < 4);
    assert.ok(card.definition.length > 8);
  }
});

test("Anti-loop never repeats a word until the deck is cleared", () => {
  let run = startStormRun(C1_SYNONYMS_STORM);
  const seen = new Set<number>();
  for (let i = 0; i < C1_SYNONYMS_STORM.length; i += 1) {
    const dealt = dealNextStormWord(run, C1_SYNONYMS_STORM);
    run = dealt.run;
    assert.equal(seen.has(dealt.card.id), false);
    seen.add(dealt.card.id);
  }
  assert.equal(seen.size, C1_SYNONYMS_STORM.length);
  const extra = dealNextStormWord(run, C1_SYNONYMS_STORM);
  assert.ok(C1_SYNONYMS_STORM.some((card) => card.id === extra.card.id));
});

test("Fast answers amplify combo; slow answers reset it", () => {
  assert.deepEqual(scoreStormHit(900, 0), { combo: 2, gained: 2 });
  assert.deepEqual(scoreStormHit(800, 2), { combo: 3, gained: 3 });
  assert.deepEqual(scoreStormHit(5100, 5), { combo: 0, gained: 1 });
});
