import test from 'node:test';
import assert from 'node:assert/strict';
import { bestVehicle, framingAdvice, shotExamples, shotTips } from '../src/coaching.js';
test('clipping takes priority over distance advice', () => assert.match(framingAdvice([0, 20, 200, 100], 1000, 600), /Step back/));
test('small vehicle needs a closer frame', () => assert.match(framingAdvice([400, 200, 200, 100], 1000, 600), /Move closer/));
test('centered vehicle with margins is ready', () => assert.match(framingAdvice([200, 100, 600, 400], 1000, 600), /Good framing/));
test('off-center vehicle has correct camera direction', () => {
  assert.match(framingAdvice([40, 100, 500, 300], 1000, 600), /Aim a little left/);
  assert.match(framingAdvice([450, 100, 500, 300], 1000, 600), /Aim a little right/);
});
test('all six shot types have instructions', () => assert.equal(Object.keys(shotTips).length, 6));

test('every shot has a distinct reference and accessible description', () => {
  assert.deepEqual(Object.keys(shotExamples), Object.keys(shotTips));
  assert.equal(new Set(Object.values(shotExamples).map(example => example.src)).size, 6);
  for (const example of Object.values(shotExamples)) assert.ok(example.alt.length > 20);
});
test('vehicle detection ignores people, low confidence and invalid boxes', () => {
  const prediction = (name, score, bbox = [20, 30, 400, 200]) => ({ class: name, score, bbox });
  const car = prediction('car', 0.8);
  assert.equal(bestVehicle([prediction('person', 0.99), prediction('car', 0.4), prediction('truck', 0.9, [0, 0, 0, 20]), car]), car);
  assert.equal(bestVehicle([prediction('person', 0.99)]), undefined);
  assert.equal(bestVehicle([car, prediction('truck', 0.95)]).class, 'truck');
});
