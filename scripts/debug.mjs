/**
 * Swift Dice's part of the debug file of Sephral's modules: per roll message which dice it showed or why it skipped
 * them, the settings of this device, the throws on the table and the recent decisions.
 */

import {MODULE_ID, t} from "./config.mjs";
import {DebugTrace, registerDebugMenu, registerDebugProvider} from "./debug-file.mjs";

/** The recent decisions of the module. */
export const trace = new DebugTrace();

/** Reads the module state; set by the entry script, so this file stays free of page code for its tests. */
let readState = () => ({});

/** Describes what the module made of a message; set by the entry script. */
let readMessage = () => ({});

/**
 * Run one part and keep its error instead, so one broken reading does not cost the rest.
 * @param {Function} fn
 * @returns {*}
 */
function attempt(fn) {
  try {
    return fn();
  } catch(err) {
    return {error: String(err?.message ?? err)};
  }
}

/**
 * What the module knows right now.
 * @returns {object}
 */
export function describeState() {
  return {
    device: attempt(() => ({
      enabled: game.settings.get(MODULE_ID, "enabled"),
      placement: game.settings.get(MODULE_ID, "placement"),
      size: game.settings.get(MODULE_ID, "size"),
      linger: game.settings.get(MODULE_ID, "linger"),
      reducedMotion: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? null,
      hiddenTab: globalThis.document?.hidden ?? null,
      css3d: globalThis.CSS?.supports?.("transform-style", "preserve-3d") ?? null
    })),
    diceSoNice: attempt(() => !!game.modules.get("dice-so-nice")?.active),
    users: attempt(() => game.users.map(u => ({id: u.id, color: String(u.color?.css ?? u.color ?? ""),
      look: u.flags?.[MODULE_ID]?.look ?? null}))),
    ...attempt(() => readState())
  };
}

/**
 * The button in the settings and the module's part of the file. Call in "init".
 * @param {object} [hooks]
 * @param {() => object} [hooks.state]       More of the module state (table, waiting cards)
 * @param {(message: object) => object} [hooks.message]   What the module made of a message
 */
export function registerDebug({state, message} = {}) {
  if ( state ) readState = state;
  if ( message ) readMessage = message;
  registerDebugMenu(MODULE_ID, {name: "SSD.DEBUG.Title", label: "SSD.DEBUG.Save", hint: "SSD.DEBUG.Hint"});
  registerDebugProvider({
    moduleId: MODULE_ID,
    label: () => t("SSD.DEBUG.Entry"),
    notice: file => t("SSD.DEBUG.Saved", {file}),
    recent: () => ({details: describeState()}),
    applies: msg => !!(msg?.rolls?.length || msg?.flags?.rsr5e?.rolls?.length),
    message: msg => attempt(() => readMessage(msg)),
    trace
  });
}
