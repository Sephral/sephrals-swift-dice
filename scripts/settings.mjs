/**
 * Settings of the module. Like in every Sephral module, all options appear in Foundry's settings dialog under this
 * module, starting with the module language. The GM sets how the table plays (world), every user sets how the dice
 * appear on their own screen (client). The look of a user's dice is a flag on their user, so the others can read it.
 */

import {ICON, MODULE_ID, t} from "./config.mjs";
import {FOLLOW_FOUNDRY, applyModuleLanguage} from "./language.mjs";
import {runSelfTest} from "./selftest.mjs";
import {CUSTOM_DICE, RULES, ruleKey} from "./systems.mjs";

/**
 * The settings of the module, in the order they appear in the settings dialog.
 * @type {Record<string, object>}
 */
export const SETTINGS = {
  uiLanguage: {type: String, default: FOLLOW_FOUNDRY, scope: "client", onChange: "language", choices: {
    [FOLLOW_FOUNDRY]: "SSD.LANGUAGE.default", de: "SSD.LANGUAGE.de", en: "SSD.LANGUAGE.en"}},
  enabled: {type: Boolean, default: true, scope: "client", onChange: "clear"},
  placement: {type: String, default: "tray", scope: "client", choices: {
    tray: "SSD.SETTINGS.placement.tray", center: "SSD.SETTINGS.placement.center"}},
  size: {type: Number, default: 56, scope: "client", range: {min: 32, max: 96, step: 4}},
  linger: {type: Number, default: 2.5, scope: "client", range: {min: 1, max: 8, step: 0.5}},
  deviceEffects: {type: Boolean, default: true, scope: "client"},
  sounds: {type: Boolean, default: false, scope: "client"},
  sceneControl: {type: Boolean, default: true, scope: "client", onChange: "controls"},
  reveal: {type: String, default: "dice", choices: {
    dice: "SSD.SETTINGS.reveal.dice", instant: "SSD.SETTINGS.reveal.instant"}},
  speed: {type: String, default: "normal", choices: {
    fast: "SSD.SETTINGS.speed.fast", normal: "SSD.SETTINGS.speed.normal", slow: "SSD.SETTINGS.speed.slow"}},
  sequential: {type: Boolean, default: true},
  colors: {type: String, default: "choice", choices: {
    choice: "SSD.SETTINGS.colors.choice", player: "SSD.SETTINGS.colors.player"}},
  initiative: {type: Boolean, default: true},
  npcRolls: {type: Boolean, default: true},
  hiddenRolls: {type: String, default: "own", choices: {
    own: "SSD.SETTINGS.hiddenRolls.own", all: "SSD.SETTINGS.hiddenRolls.all", none: "SSD.SETTINGS.hiddenRolls.none"}},
  // What counts as a triumph or a fumble: the game system's rule, or the GM's own (its fields start with the rule of
  // the system, see registerSettings)
  moments: {type: String, default: "system", choices: {
    system: "SSD.SETTINGS.moments.system", custom: "SSD.SETTINGS.moments.custom", none: "SSD.SETTINGS.moments.none"}},
  momentDie: {type: String, default: "d20", choices: Object.fromEntries(CUSTOM_DICE.map(d => [d,
    `SSD.SETTINGS.momentDie.${d}`]))},
  momentTriumph: {type: String, default: "20"},
  momentFumble: {type: String, default: "1"},
  effects: {type: String, default: "all", choices: {
    all: "SSD.SETTINGS.effects.all", crits: "SSD.SETTINGS.effects.crits", none: "SSD.SETTINGS.effects.none"}},
  maxDice: {type: Number, default: 10, range: {min: 2, max: 20, step: 1}},
  minFps: {type: Number, default: 20, range: {min: 0, max: 45, step: 5}}
};

/**
 * Register all settings of the module and its menus.
 * @param {{language: Function, clear: Function, controls: Function, openMyDice: Function}} handlers
 */
export function registerSettings(handlers) {
  openMyDiceMenu = handlers.openMyDice;
  // The menus first: Foundry lists them before the settings, after the window Sephral's Modules
  game.settings.registerMenu(MODULE_ID, "myDice", {
    name: "SSD.MyDice.title",
    label: "SSD.MyDice.open",
    hint: "SSD.MyDice.menuHint",
    icon: ICON,
    type: MyDiceMenu,
    restricted: false
  });
  game.settings.registerMenu(MODULE_ID, "selfTest", {
    name: "SSD.SELFTEST.Title",
    label: "SSD.SELFTEST.Run",
    hint: "SSD.SELFTEST.Hint",
    icon: "fa-solid fa-stethoscope",
    type: SelfTestMenu,
    restricted: true
  });

  // The GM's own rule starts as the rule of the game system
  const start = RULES[ruleKey(game.system?.id)]?.custom ?? RULES.d20.custom;
  const defaults = {momentDie: start.die, momentTriumph: start.triumph, momentFumble: start.fumble};
  for ( const [key, def] of Object.entries(SETTINGS) ) {
    game.settings.register(MODULE_ID, key, {
      name: `SSD.SETTINGS.${key}.name`,
      hint: `SSD.SETTINGS.${key}.hint`,
      scope: def.scope ?? "world",
      config: true,
      type: def.type,
      choices: def.choices,
      range: def.range,
      default: (key in defaults) ? defaults[key] : def.default,
      onChange: def.onChange ? value => handlers[def.onChange]?.(value) : undefined
    });
  }
  game.settings.register(MODULE_ID, "acknowledgedVersions", {scope: "client", config: false, type: String,
    default: ""});
  game.settings.register(MODULE_ID, "diceSoNiceNotice", {scope: "client", config: false, type: Boolean,
    default: false});
}

/** Opens the window for the menu button. */
let openMyDiceMenu = () => {};

/** The menu button which opens the window with the user's dice (the one window, not a second copy of it). */
class MyDiceMenu extends foundry.applications.api.ApplicationV2 {
  /** @override */
  async render() {
    await openMyDiceMenu();
    return this;
  }
}

/** The menu button which runs the self-test. Foundry only accepts application classes as menus. */
class SelfTestMenu extends foundry.applications.api.ApplicationV2 {
  /** @override */
  async render() {
    if ( game.user.isGM ) await runSelfTest();
    return this;
  }
}

/** The fields of the GM's own rule for big moments. */
const CUSTOM_FIELDS = ["momentDie", "momentTriumph", "momentFumble"];

/**
 * Foundry's settings dialog: say under "Big moments" what the game system counts, and offer the fields of the own
 * rule only while it is picked.
 * @param {HTMLElement} html   The settings dialog
 */
export function decorateSettings(html) {
  const root = (html instanceof HTMLElement) ? html : html?.[0];
  const select = root?.querySelector(`[name="${MODULE_ID}.moments"]`);
  if ( !select ) return;
  const group = select.closest(".form-group");
  if ( group && !group.querySelector(".ssd-rule") ) {
    const note = document.createElement("p");
    note.className = "hint ssd-rule";
    note.textContent = t("SSD.SETTINGS.moments.rule", {system: game.system?.title ?? game.system?.id ?? "",
      rule: t(`SSD.Rules.${ruleKey(game.system?.id)}`)});
    (group.querySelector(".form-fields") ?? group).after(note);
  }
  const fields = CUSTOM_FIELDS.map(key => root.querySelector(`[name="${MODULE_ID}.${key}"]`)).filter(Boolean);
  const toggle = () => {
    for ( const field of fields ) {
      field.disabled = select.value !== "custom";
      field.closest(".form-group")?.classList.toggle("ssd-off", select.value !== "custom");
    }
  };
  select.addEventListener("change", toggle);
  toggle();
}

/**
 * Switch the module strings when the user picks another module language, then redraw.
 * @param {string} value
 * @param {Function} redraw
 */
export function changeLanguage(value, redraw) {
  applyModuleLanguage(value).then(() => {
    redraw();
    if ( game.settings.sheet?.rendered ) game.settings.sheet.render();
  });
}
