/**
 * The frame rate of this browser, so a slow screen can skip the dice (GM setting). Counts the frames Foundry's canvas
 * draws, once a second, and keeps the last few seconds. Without a canvas nothing is counted and dice always show.
 */

/** Seconds of history; the median of them decides. */
const KEEP = 6;

const samples = [];
let frames = 0;
let lastCount = 0;
let timer = null;
let ticker = null;

/** Count one canvas frame. */
function countFrame() {
  frames++;
}

/**
 * Start counting, or follow a new canvas application. Call on "canvasReady".
 */
export function watchFrameRate() {
  const current = globalThis.canvas?.app?.ticker ?? null;
  if ( current && (current !== ticker) ) {
    ticker?.remove(countFrame);
    ticker = current;
    ticker.add(countFrame, null, globalThis.PIXI?.UPDATE_PRIORITY?.UTILITY ?? -50);
  }
  if ( !timer ) {
    lastCount = performance.now();
    timer = setInterval(sample, 1000);
  }
}

/** Take the frames of the last second. */
function sample() {
  const now = performance.now();
  const seconds = (now - lastCount) / 1000;
  lastCount = now;
  const counted = frames;
  frames = 0;
  // A tab in the background draws nothing, that is no slow screen
  if ( document.hidden || !ticker || !globalThis.canvas?.ready || (seconds <= 0) ) return;
  samples.push(counted / seconds);
  if ( samples.length > KEEP ) samples.shift();
}

/**
 * The frame rate of the last seconds, or null while unknown.
 * @param {number[]} [values]   For tests
 * @returns {number|null}
 */
export function frameRate(values = samples) {
  if ( values.length < 3 ) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return (sorted.length % 2) ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Is this screen too slow for dice?
 * @param {number} minimum   Frames per second below which dice are skipped, 0 = never
 * @param {number[]} [values]   For tests
 * @returns {boolean}
 */
export function tooSlow(minimum, values = samples) {
  if ( !minimum ) return false;
  const fps = frameRate(values);
  return (fps !== null) && (fps < minimum);
}
