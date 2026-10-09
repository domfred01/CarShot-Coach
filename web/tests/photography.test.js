import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLook, coverCrop, looks } from '../src/photography.js';

test('portrait preview crops landscape input at its center', () => {
  const crop = coverCrop(1920, 1080, 390, 844);
  assert.equal(crop.y, 0);
  assert.equal(crop.height, 1080);
  assert.ok(Math.abs(crop.width / crop.height - 390 / 844) < 0.0001);
  assert.ok(Math.abs(crop.x + crop.width / 2 - 960) < 0.0001);
});
test('wide viewport crops top and bottom without stretching', () => {
  assert.deepEqual(coverCrop(720, 1280, 1000, 500), { x: 0, y: 460, width: 720, height: 360 });
  assert.deepEqual(coverCrop(1280, 720, 1280, 720), { x: 0, y: 0, width: 1280, height: 720 });
});
test('Original exports unchanged pixels, including alpha', () => {
  const pixels = new Uint8ClampedArray([220, 30, 50, 128, 0, 255, 110, 255]);
  const original = pixels.slice();
  applyLook(pixels, looks.original);
  assert.deepEqual(pixels, original);
});
test('Silver exports actual monochrome pixels and preserves alpha', () => {
  const pixels = new Uint8ClampedArray([220, 30, 50, 128, 30, 200, 110, 255]);
  applyLook(pixels, looks.silver);
  assert.equal(pixels[0], pixels[1]);
  assert.equal(pixels[1], pixels[2]);
  assert.equal(pixels[4], pixels[5]);
  assert.equal(pixels[5], pixels[6]);
  assert.equal(pixels[3], 128);
  assert.equal(pixels[7], 255);
});
test('Midnight darkens midtones and Golden warms neutral paint', () => {
  const night = new Uint8ClampedArray([128, 128, 128, 255]);
  applyLook(night, looks.midnight);
  assert.ok(night[0] < 128);
  const warm = new Uint8ClampedArray([128, 128, 128, 255]);
  applyLook(warm, looks.golden);
  assert.ok(warm[0] > warm[1] && warm[1] > warm[2]);
});
