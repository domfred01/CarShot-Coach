import test from 'node:test';
import assert from 'node:assert/strict';
import { framingAdvice, shotTips } from '../src/coaching.js';
test('clipping takes priority over distance advice', () => assert.match(framingAdvice([0, 20, 200, 100], 1000, 600), /Step back/));
test('small vehicle needs a closer frame', () => assert.match(framingAdvice([400, 200, 200, 100], 1000, 600), /Move closer/));
test('centered vehicle with margins is ready', () => assert.match(framingAdvice([200, 100, 600, 400], 1000, 600), /Good framing/));
test('off-center vehicle has correct camera direction', () => {
  assert.match(framingAdvice([40, 100, 500, 300], 1000, 600), /Aim a little left/);
  assert.match(framingAdvice([450, 100, 500, 300], 1000, 600), /Aim a little right/);
});
test('all six shot types have instructions', () => assert.equal(Object.keys(shotTips).length, 6));
