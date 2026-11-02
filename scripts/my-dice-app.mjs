/**
 * The window "My dice": every user picks how their dice look for everyone. By default they take the color the user
 * picked in Foundry. Ready-made looks, looks of the classes (or dice that follow the class of the character who
 * rolls), a color of their own, a second color with a pattern, the surface, the number color, the font, a color for
 * the d20, the effects and their colors are the choices; a test throw shows them.
 *
 * Colors that come from the die color (the second color, the light, the effects) stay automatic until the user picks
 * one, so dice in the player color follow it completely.
 */

import {ICON, LOOK_FLAG, MODULE_ID, TEMPLATES, addSettingsGear, isShown, setting, t} from "./config.mjs";
import {effectsHere, lookOf, tableJudge, throwDuration} from "./chat.mjs";
import {themeOf} from "./classes.mjs";
import {AURAS, CLASS_LOOKS, CORES, EFFECT_COLORS, FINISHES, FONTS, FUMBLES, GLOWS, LANDINGS, PATTERNS, PRESETS,
  SEE_THROUGH, THROWS, TRAIL_KINDS, TRIUMPHS, lookForDie, normalizeHex, numberColor, randomLook, readyLook,
  readyLookOf, tone} from "./colors.mjs";
import {seededRandom} from "./motion.mjs";
import {buildAura, buildCore, buildDie, buildInner} from "./render.mjs";
import {diceToThrow} from "./rolls.mjs";
import {throwDice} from "./tray.mjs";
import {countFeature} from "./usage.mjs";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

/** The dice of a test throw. */
const TEST_FORMULA = "1d20 + 1d12 + 1d10 + 1d8 + 1d6 + 1d4";

/** The dice of the preview. */
const PREVIEW = [{type: "d20", value: 20, faces: 20, unit: 30}, {type: "d6", value: 6, faces: 6, unit: 21},
  {type: "d4", value: 4, faces: 4, unit: 20}];

/** Color fields that are automatic until the user picks a color: derived from the die color or the light. */
const AUTO_COLORS = ["second", "glowColor", ...Object.values(EFFECT_COLORS)];

/** Colors that follow the die color; they go back to automatic when the user takes the player color again. */
const FOLLOW_BODY = ["second", "glowColor"];

/**
 * A color field that can be automatic: while it is, it shows the color the effect has and stores nothing; once the
 * user picks a color, a small button takes it back to automatic.
 */
Handlebars.registerPartial("ssdColorPick", `<span class="ssd-pick">
  <input type="color" name="{{field.name}}" value="{{field.value}}" {{#if field.auto}}data-auto="1"{{/if}}
    aria-label="{{label}}" data-tooltip="{{label}}: {{field.tooltip}}">
  {{#unless field.auto}}<button type="button" class="ssd-auto" data-action="autoColor" data-key="{{field.name}}"
    data-tooltip="{{back}}" aria-label="{{back}}"><i class="fa-solid fa-xmark" inert></i></button>{{/unless}}
</span>`);

/**
 * The character whose class the dice follow in this browser: the selected token, or the user's character.
 * @returns {Actor|null}
 */
function ownActor() {
  return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
}

export class MyDiceApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "ssd-my-dice",
    classes: ["ssd-app"],
    tag: "section",
    window: {title: "SSD.MyDice.title", icon: ICON, resizable: false},
    position: {width: 820, height: "auto"},
    actions: {
      testThrow: MyDiceApp.#onTestThrow,
      preset: MyDiceApp.#onPreset,
      classLook: MyDiceApp.#onClassLook,
      randomize: MyDiceApp.#onRandomize,
      autoColor: MyDiceApp.#onAutoColor,
      resetLook: MyDiceApp.#onReset
    }
  };

  /** @override */
  static PARTS = {main: {template: `${TEMPLATES}/my-dice.hbs`}};

  /** @override */
  get title() {
    return t("SSD.MyDice.title");
  }

  /** @override */
  async _prepareContext() {
    const choice = game.user.getFlag(MODULE_ID, LOOK_FLAG) ?? {};
    const allowOwn = setting("colors") === "choice";
    const playerColor = normalizeHex(game.user.color) ?? "#7a5c3e";
    // The user's own look, not the class look: the fields show what the user picked
    const look = lookOf(game.user);
    const option = (list, current, prefix) => list.map(key => ({key, label: t(`SSD.MyDice.${prefix}.${key}`),
      selected: key === current}));
    // A color field with its automatic value: what the effect shows while the user picked none
    const auto = (key, shown) => {
      const own = normalizeHex(choice[key]);
      return {name: key, value: own ?? shown, auto: !own,
        tooltip: own ? t("SSD.MyDice.colorOwn") : t("SSD.MyDice.colorAuto")};
    };
    const actor = ownActor();
    const theme = themeOf(actor);
    let classStatus;
    if ( !actor ) classStatus = t("SSD.MyDice.byClassNone");
    else if ( !theme ) classStatus = t("SSD.MyDice.byClassUnknown", {name: actor.name});
    else {
      const kind = (theme.by === "class") ? t(`SSD.Classes.${theme.key}`) : t(`SSD.Creatures.${theme.key}`);
      classStatus = t("SSD.MyDice.byClassFound", {name: actor.name, kind});
    }
    // The ready look or class look the user took, while nothing of it changed since
    const presetNow = readyLookOf(choice, Object.keys(PRESETS));
    const classNow = readyLookOf(choice);
    return {
      own: allowOwn && (choice.mode === "own"),
      allowOwn,
      playerColor,
      ownColor: normalizeHex(choice.color) ?? playerColor,
      d20On: allowOwn && !!normalizeHex(choice.d20),
      d20Color: normalizeHex(choice.d20) ?? tone(look.body, 0.35),
      second: auto("second", look.second),
      textOwn: allowOwn && !!normalizeHex(choice.text),
      textColor: normalizeHex(choice.text) ?? numberColor(look.body),
      patterns: option(PATTERNS, look.pattern, "patterns"),
      finishes: option(FINISHES, look.finish, "finishes"),
      fonts: Object.entries(FONTS).map(([key, family]) => ({key, family, label: t(`SSD.MyDice.fonts.${key}`),
        selected: key === look.font})),
      glows: option(GLOWS, look.glow, "glows"),
      glowColor: auto("glowColor", look.glowColor),
      trailColor: auto("trailColor", look.glowColor),
      auraColor: auto("auraColor", look.glowColor),
      landingColor: auto("landingColor", look.glowColor),
      coreColor: auto("coreColor", look.glowColor),
      throwColor: auto("throwColor", look.glowColor),
      trails: option(TRAIL_KINDS, look.trail, "trails"),
      auras: option(AURAS, look.aura, "auras"),
      throws: option(THROWS, look.throw, "throws"),
      triumphs: option(TRIUMPHS, look.triumph, "triumphs"),
      fumbles: option(FUMBLES, look.fumble, "fumbles"),
      landings: option(LANDINGS, look.landing, "landings"),
      cores: option(CORES, choice.core ?? "none", "cores"),
      coreHidden: !SEE_THROUGH.includes(look.finish) && (choice.core ?? "none") !== "none",
      effectsOff: !effectsHere().glow,
      byClass: !!choice.byClass,
      classStatus,
      presets: Object.entries(PRESETS).map(([key, p]) => ({key, ...p, label: t(`SSD.MyDice.presets.${key}`),
        active: key === presetNow})),
      classes: Object.entries(CLASS_LOOKS).map(([key, p]) => ({key, ...p, label: t(`SSD.Classes.${key}`),
        active: key === classNow})),
      text: Object.fromEntries(["presetsLabel", "color", "player", "own", "locked", "d20", "style", "pattern", "second",
        "finish", "numbers", "textAuto", "textOwn", "font", "effects", "glow", "glowColor", "trail", "effectsOff", "core",
        "aura", "landing", "throw", "triumph", "fumble", "throwing", "coreHint", "random", "test", "everyone",
        "classesLabel", "byClass", "reset", "resetHint", "colorBack"].map(key => [key, t(`SSD.MyDice.${key}`)]))
    };
  }

  /** @override */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    addSettingsGear(frame);
    return frame;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#drawPreview();
    const form = this.element.querySelector("form");
    // The parts share the width of their longest name
    const widest = Math.max(0, ...[...form.querySelectorAll(".ssd-fields .ssd-key")].map(k => k.getBoundingClientRect().width));
    if ( widest ) form.style.setProperty("--ssd-keys", `${Math.ceil(widest)}px`);
    form.addEventListener("change", event => {
      const target = event.target;
      if ( (target.name === "core") && (target.value !== "none") && !SEE_THROUGH.includes(form.elements.finish.value) ) {
        form.elements.finish.value = "glass";
      }
      // Back to the player color: the colors that come from the die color follow it again
      if ( (target.name === "mode") && (target.value === "player") ) {
        for ( const key of FOLLOW_BODY ) {
          if ( form.elements[key] ) form.elements[key].dataset.auto = "1";
        }
      }
      if ( (target.type === "color") && AUTO_COLORS.includes(target.name) ) delete target.dataset.auto;
      this.#save();
    });
    // Color fields change live while their picker is open, the preview follows before anything is stored
    form.addEventListener("input", event => {
      const target = event.target;
      if ( target.type !== "color" ) return;
      const name = target.name;
      if ( AUTO_COLORS.includes(name) ) delete target.dataset.auto;
      if ( name === "color" ) form.querySelector("input[name=mode][value=own]").checked = true;
      if ( name === "d20" ) form.querySelector("input[name=d20On]").checked = true;
      if ( name === "text" ) form.querySelector("select[name=textMode]").value = "own";
      if ( (name === "glowColor") && (form.elements.glow.value === "none") ) form.elements.glow.value = "soft";
      this.#drawPreview(this.#read());
    });
  }

  /**
   * The choice as the form shows it.
   * @returns {object}
   */
  #read() {
    const form = this.element.querySelector("form");
    const value = name => form.elements[name]?.value;
    // A color field still on automatic stores nothing
    const color = name => {
      const field = form.elements[name];
      if ( !field || (field.dataset.auto === "1") ) return null;
      return normalizeHex(field.value);
    };
    const choice = {
      mode: form.querySelector("input[name=mode]:checked")?.value ?? "player",
      color: normalizeHex(value("color")),
      d20: form.elements.d20On?.checked ? normalizeHex(value("d20")) : null,
      second: color("second"),
      pattern: value("pattern") ?? "none",
      finish: value("finish") ?? "glossy",
      text: (value("textMode") === "own") ? normalizeHex(value("text")) : null,
      font: value("font") ?? "classic",
      glow: value("glow") ?? "none",
      glowColor: color("glowColor"),
      trail: value("trail") ?? "none",
      core: value("core") ?? "none",
      aura: value("aura") ?? "none",
      landing: value("landing") ?? "none",
      throw: value("throw") ?? "classic",
      triumph: value("triumph") ?? "burst",
      fumble: value("fumble") ?? "sink",
      byClass: !!form.elements.byClass?.checked
    };
    for ( const key of Object.values(EFFECT_COLORS) ) choice[key] = color(key);
    return choice;
  }

  /**
   * Store the choice on the user, so every browser draws these dice the same. Every choice names all its keys (an
   * automatic color as null), so nothing of an earlier look stays behind when Foundry merges the update.
   * @param {object} [choice]
   */
  async #save(choice = this.#read()) {
    const before = game.user.getFlag(MODULE_ID, LOOK_FLAG) ?? {};
    if ( (choice.mode === "own") && (before.mode !== "own") ) countFeature(MODULE_ID, "ownColor");
    if ( choice.byClass && !before.byClass ) countFeature(MODULE_ID, "byClass");
    this.#drawPreview(choice);
    await game.user.update({[`flags.${MODULE_ID}.${LOOK_FLAG}`]: choice});
  }

  /**
   * Draw the dice of the preview, turning slowly: the look the next roll of the user's character gets.
   * @param {object} [choice]   A choice not stored yet
   */
  #drawPreview(choice) {
    const stage = this.element?.querySelector(".ssd-preview");
    if ( !stage ) return;
    const user = choice ? {color: game.user.color, getFlag: () => choice} : game.user;
    const look = lookOf(user, {actor: ownActor()});
    stage.replaceChildren();
    const rand = seededRandom(`preview:${game.user.id}`);
    PREVIEW.forEach((die, i) => {
      const holder = document.createElement("div");
      holder.className = `ssd-preview-die ssd-preview-${i}`;
      const spin = document.createElement("div");
      spin.className = "ssd-preview-spin";
      const dieLook = lookForDie(look, die.type);
      const built = buildDie(die, dieLook, {unit: die.unit, rand, spin: 0});
      built.element.style.transform = `matrix3d(${toCss(built.resting)})`;
      spin.append(built.element);
      // The aura of the preview dice, at their place
      const fx = buildAura(dieLook, rand, die.unit * 2);
      for ( const part of [fx.table, fx.around] ) {
        if ( !part ) continue;
        part.style.setProperty("--ssd-size", `${die.unit * 2}px`);
        part.classList.add("ssd-preview-fx");
        holder.append(part);
      }
      const inner = buildInner(dieLook);
      if ( inner ) {
        inner.style.setProperty("--ssd-size", `${die.unit * 2}px`);
        inner.classList.add("ssd-preview-core");
        holder.append(inner);
      }
      const core = buildCore(dieLook, {size: die.unit * 2,
        animate: !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches});
      if ( core ) {
        core.style.setProperty("--ssd-size", `${die.unit * 2}px`);
        core.classList.add("ssd-preview-core");
        holder.append(core);
      }
      if ( dieLook.glow !== "none" ) {
        const aura = document.createElement("div");
        aura.className = `ssd-aura ssd-aura-${dieLook.glow} ssd-preview-aura`;
        aura.style.setProperty("--ssd-glowc", dieLook.glowColor);
        aura.style.setProperty("--ssd-size", `${die.unit * 2}px`);
        holder.append(aura);
      }
      holder.append(spin);
      stage.append(holder);
    });
  }

  /**
   * Throw dice in this browser only, no chat message.
   */
  static async #onTestThrow() {
    await testThrow();
  }

  /**
   * A surprise: a random look with effects, stored at once like any other choice.
   */
  static async #onRandomize() {
    const allowOwn = setting("colors") === "choice";
    await this.#save(randomLook(Math.random, {allowOwn, current: this.#read()}));
    countFeature(MODULE_ID, "surprise");
  }

  /**
   * Take a ready-made look.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onPreset(event, target) {
    const choice = readyLook(target.dataset.preset, this.#read());
    if ( choice ) await this.#save({...choice, byClass: false});
  }

  /**
   * Take the look of a class.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onClassLook(event, target) {
    const choice = readyLook(target.dataset.key, this.#read());
    if ( !choice ) return;
    await this.#save({...choice, byClass: false});
    countFeature(MODULE_ID, "classLook");
  }

  /**
   * A color field goes back to automatic.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAutoColor(event, target) {
    const field = this.element.querySelector(`input[name="${target.dataset.key}"]`);
    if ( !field ) return;
    field.dataset.auto = "1";
    await this.#save();
  }

  /**
   * Everything back to the start: dice in the player color without effects.
   */
  static async #onReset() {
    this.#drawPreview({});
    await game.user.update({[`flags.${MODULE_ID}.-=${LOOK_FLAG}`]: null});
    countFeature(MODULE_ID, "resetLook");
  }
}

/**
 * A turn as CSS matrix3d numbers.
 * @param {number[][]} r
 * @returns {string}
 */
function toCss(r) {
  return [r[0][0], r[1][0], r[2][0], 0, r[0][1], r[1][1], r[2][1], 0, r[0][2], r[1][2], r[2][2], 0, 0, 0, 0, 1].join(",");
}

/**
 * Throw dice in this browser only, in the user's look (the look of their character's class when the dice follow
 * it).
 * @param {string} [formula]
 * @returns {Promise<Roll>}
 */
export async function testThrow(formula = TEST_FORMULA) {
  const roll = await new foundry.dice.Roll(formula).evaluate();
  const {dice, extra} = diceToThrow([roll], {maxDice: setting("maxDice"), judge: tableJudge()});
  const look = lookOf(game.user, {actor: ownActor()});
  for ( const die of dice ) die.look = lookForDie(look, die.type);
  throwDice(dice, {
    seed: `test:${foundry.utils.randomID()}`,
    startAt: performance.now() + 40,
    duration: throwDuration(),
    size: setting("size"),
    placement: setting("placement"),
    linger: setting("linger"),
    extra,
    reducedMotion: !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    effects: effectsHere(),
    style: look.throw,
    sounds: setting("sounds")
  });
  countFeature(MODULE_ID, "testThrow");
  return roll;
}

/**
 * Open the window, or bring it to the front.
 * @returns {Promise<MyDiceApp>}
 */
export async function openMyDice() {
  const existing = foundry.applications.instances.get("ssd-my-dice");
  countFeature(MODULE_ID, "myDice");
  if ( isShown(existing) ) {
    existing.bringToFront();
    return existing;
  }
  const app = existing ?? new MyDiceApp();
  await app.render({force: true});
  return app;
}

/**
 * Redraw the window if it is open (another setting or the user's color changed).
 */
export function refreshMyDice() {
  const app = foundry.applications.instances.get("ssd-my-dice");
  if ( isShown(app) ) app.render();
}
