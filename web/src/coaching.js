/** @param {number[]} box @param {number} width @param {number} height */
export function framingAdvice(box, width, height) {
  const [x, y, w, h] = box;
  if (x < width * 0.03 || y < height * 0.03 || x + w > width * 0.97 || y + h > height * 0.97) return 'Step back — leave space around the car';
  if (w / width < 0.45) return 'Move closer — make the car fill more of the frame';
  const center = (x + w / 2) / width;
  if (center < 0.38) return 'Aim a little left to center the car';
  if (center > 0.62) return 'Aim a little right to center the car';
  return 'Good framing — hold steady and take your shot';
}

/** @type {Record<string, string>} */
export const shotTips = {
  'Front 3/4': 'Stand near a front corner so you can see the front and one side. Keep the camera around headlight height.',
  'Rear 3/4': 'Stand near a rear corner. Include the rear and one side, with space around the whole car.',
  Side: 'Stand perpendicular to the doors. Keep both wheels in view and the camera level.',
  Front: 'Center yourself on the grille. Keep the headlights balanced and the camera level.',
  Rear: 'Center yourself behind the car. Keep both rear corners in view.',
  Interior: 'Look for clean lines in the dashboard. Avoid bright reflections and keep the camera steady.',
};

/** @type {Record<string, {src: string, alt: string}>} */
export const shotExamples = {
  'Front 3/4': { src: '/examples/front-three-quarter-white-v3.jpg', alt: 'White Ferrari 488 with a black roof, silver five-spoke wheels and yellow calipers photographed from a front corner, showing the nose and one side with room around the car.' },
  'Rear 3/4': { src: '/examples/rear-three-quarter-v2.jpg', alt: 'Modified blue Nissan Skyline R34 GT-R from a rear corner, with round taillights, bronze wheels and a rear wing.' },
  Side: { src: '/examples/side-v3.jpg', alt: 'Modified white Nissan GT-R R35 in a level side profile, with bronze wheels and subtle aero.' },
  Front: { src: '/examples/front-v2.jpg', alt: 'Yellow Ferrari F8 photographed straight-on, with a centered nose and balanced headlights.' },
  Rear: { src: '/examples/rear-v2.jpg', alt: 'Silver Porsche 911 GT3 from directly behind, with a rear wing and both taillights in view.' },
  Interior: { src: '/examples/interior-v3.jpg', alt: 'Nissan Skyline R34 GT-R interior with right-hand-drive steering wheel, dashboard gauges and manual shifter.' },
};

/** @param {import('@tensorflow-models/coco-ssd').DetectedObject[]} predictions */
export function bestVehicle(predictions) {
  return predictions.filter(p => (p.class === 'car' || p.class === 'truck') && Number.isFinite(p.score) && p.score >= 0.5 && p.bbox.every(Number.isFinite) && p.bbox[2] > 0 && p.bbox[3] > 0)
    .sort((a, b) => b.score - a.score)[0];
}
