/**
 * Constants and small helpers shared by the scripts of the module.
 */

/** The id of this module. */
export const MODULE_ID = "sephrals-swift-dice";

/** The folder of the module's templates. */
export const TEMPLATES = `modules/${MODULE_ID}/templates`;

/** The Foundry versions the module was verified against (see the self-test). */
export const TESTED_VERSIONS = {core: "14.369"};

/** The icon of the module. */
export const ICON = "fa-solid fa-dice-d20";

/** The flag on a user with their choice of dice. */
export const LOOK_FLAG = "look";

/** How long a throw takes, by the speed setting (milliseconds). */
export const DURATIONS = {fast: 1000, normal: 1400, slow: 1900};

/**
 * Read a setting of this module.
 * @param {string} key
 * @returns {*}
 */
export function setting(key) {
  return game.settings.get(MODULE_ID, key);
}

/**
 * Localize a key, with optional data.
 * @param {string} key
 * @param {object} [data]
 * @returns {string}
 */
export function t(key, data) {
  return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

/**
 * Escape a value for HTML.
 * @param {*} value
 * @returns {string}
 */
export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;",
    "'": "&#39;"})[ch]);
}

/**
 * Is Dice So Nice active? Then this module stays out of the way, so nobody sees two sets of dice.
 * @returns {boolean}
 */
export function diceSoNiceActive() {
  return !!game.modules.get("dice-so-nice")?.active;
}

/**
 * Is a window open or on its way? While an application renders, its "rendered" flag is false, and a redraw asked
 * for in that moment would be lost.
 * @param {ApplicationV2|undefined} app
 * @returns {boolean}
 */
export function isShown(app) {
  const states = foundry.applications.api.ApplicationV2.RENDER_STATES;
  return !!app && ((app.state === states.RENDERED) || (app.state === states.RENDERING));
}

/**
 * Open Foundry's settings on the tab of this module.
 */
export async function openSettings() {
  const sheet = game.settings.sheet;
  await sheet.render({force: true});
  try {
    sheet.changeTab(MODULE_ID, "categories");
  } catch(err) {
    console.warn(`${MODULE_ID} | The settings have no tab for this module`, err);
  }
  sheet.bringToFront?.();
}

/**
 * Put a gear into the title bar of a window that opens the settings of this module. Every user has settings of
 * this module on their own device, so everyone gets the gear.
 * @param {HTMLElement} frame   The window frame
 */
export function addSettingsGear(frame) {
  const header = frame?.querySelector(".window-header");
  if ( !header || header.querySelector(".ssd-settings") ) return;
  const gear = document.createElement("button");
  gear.type = "button";
  gear.className = "header-control icon fa-solid fa-gear ssd-settings";
  gear.dataset.tooltip = t("SSD.gear");
  gear.setAttribute("aria-label", t("SSD.gear"));
  gear.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    openSettings();
  });
  const anchor = header.querySelector("[data-action=toggleControls]") ?? header.querySelector("[data-action=close]");
  if ( anchor ) anchor.before(gear);
  else header.append(gear);
}
