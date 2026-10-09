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
