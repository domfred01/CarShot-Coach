import test from 'node:test';
import assert from 'node:assert/strict';
import { enhancePixels, photoStats, postShotTips } from '../src/enhancement.js';

test('Auto Pop preserves black, white, alpha and monochrome', () => {
  const pixels = new Uint8ClampedArray([0,0,0,255,255,255,255,255,90,90,90,128]);
  enhancePixels(pixels, 3, 1, photoStats(pixels));
  assert.deepEqual([...pixels.slice(0,8)], [0,0,0,255,255,255,255,255]);
  assert.equal(pixels[8], pixels[9]); assert.equal(pixels[9], pixels[10]);
  assert.equal(pixels[11], 128); assert.ok(pixels[8] > 90 && pixels[8] < 110);
});
test('Vehicle box emphasizes the subject with a gentler background adjustment', () => {
  const pixels = new Uint8ClampedArray(40);
  for (let i=0; i<40; i+=4) pixels.set([90,90,90,255],i);
  enhancePixels(pixels,10,1,photoStats(pixels),[0,0,1,1]);
  assert.ok(pixels[0] > pixels[36]);
});
test('Dimension mismatch fails before changing pixels', () => {
  const pixels = new Uint8ClampedArray([60,80,90,255]); const original = pixels.slice();
  assert.throws(() => enhancePixels(pixels,2,1,photoStats(pixels)), /dimensions/);
  assert.deepEqual(pixels,original);
});
test('Photo measurements ignore transparent pixels and drive relevant tips', () => {
  assert.deepEqual(photoStats(new Uint8ClampedArray([0,0,0,0])),{mean:0.5,shadows:0,highlights:0});
  const dark = photoStats(new Uint8ClampedArray([10,10,10,255]));
  assert.equal(dark.shadows,1);
  assert.ok(postShotTips(dark,'Interior',undefined,100,100).some(tip=>tip.includes('dark')));
  const bright = photoStats(new Uint8ClampedArray([255,255,255,255]));
  assert.ok(postShotTips(bright,'Side',undefined,100,100).some(tip=>tip.includes('Bright')));
});
