import test from 'node:test';
import assert from 'node:assert/strict';
import { enhancePixels, photoStats, postShotTips, sharpenDetail } from '../src/enhancement.js';

test('Auto Pop preserves black, white, alpha and monochrome', () => {
  const pixels = new Uint8ClampedArray([0,0,0,255,255,255,255,255,90,90,90,128]);
  enhancePixels(pixels, 3, 1, photoStats(pixels));
  assert.deepEqual([...pixels.slice(0,8)], [0,0,0,255,255,255,255,255]);
  assert.equal(pixels[8], pixels[9]); assert.equal(pixels[9], pixels[10]);
  assert.equal(pixels[11], 128); assert.ok(pixels[8] > 90 && pixels[8] < 110);
});

test('Sharpening makes a soft edge clearer without exceeding the halo cap', () => {
  const values = [40,40,60,100,140,160,160];
  const pixels = new Uint8ClampedArray(7*5*4);
  for (let y=0; y<5; y++) for (let x=0; x<7; x++) pixels.set([values[x],values[x],values[x],255],(y*7+x)*4);
  const before = pixels.slice(); sharpenDetail(pixels,7,5);
  assert.ok(pixels[(2*7+2)*4] < 60);
  assert.ok(pixels[(2*7+4)*4] > 140);
  for (let i=0;i<pixels.length;i+=4) {
    assert.ok(Math.abs(pixels[i]-before[i]) <= 12);
    assert.equal(pixels[i],pixels[i+1]); assert.equal(pixels[i+3],255);
  }
});
test('Sharpening leaves flat fields and small noise unchanged', () => {
  const pixels = new Uint8ClampedArray(5*5*4);
  for (let i=0;i<pixels.length;i+=4) pixels.set([100,100,100,255],i);
  pixels[(2*5+2)*4] = 101;
  const before = pixels.slice(); sharpenDetail(pixels,5,5); assert.deepEqual(pixels,before);
});
test('Auto Pop visibly increases muted color separation', () => {
  const pixels = new Uint8ClampedArray([130,90,70,255]);
  enhancePixels(pixels,1,1,photoStats(pixels));
  assert.ok(pixels[0]-pixels[2] > 70);
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
