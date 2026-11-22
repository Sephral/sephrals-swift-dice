/**
 * Sample windows (api.samples, contract in samples.mjs): "My dice" for made-up characters, the triumph and fumble of
 * the table and the GM's rule for big moments, filled with made-up data so translators and testers see every text in
 * its place without a session. Nothing here is stored: the choices live in the window's memory, the dice thrown here
 * stay on this screen (no chat message, no socket, no usage counter).
 */

import {MODULE_ID, esc, setting, t} from "./config.mjs";
import {effectsHere, lookOf, throwDuration} from "./chat.mjs";
import {FUMBLES, TRIUMPHS, diceLook, lookForDie, readyLook} from "./colors.mjs";
import {MyDiceApp} from "./my-dice-app.mjs";
import {diceToThrow} from "./rolls.mjs";
import {CUSTOM_DICE, judgeFor} from "./systems.mjs";
import {throwDice} from "./tray.mjs";
import {creatureActor, creatureKinds, momentDice, ruleFaces, ruleSystems, sampleActors} from "./sample-data.mjs";
import {markSample, openSampleHtml, sampleId} from "./samples.mjs";

/* -------------------------------------------- */
/*  My dice                                     */
/* -------------------------------------------- */

/**
 * "My dice" over made-up characters. The user's choice, the characters and their looks sit in memory, so every control
 * works and none of it is stored.
 */
class SampleMyDice extends MyDiceApp {
  /**
   * @param {object} options
   * @param {string} options.key           The id of the sample entry
   * @param {object} [options.user]        The user's choice of dice
   * @param {string|null} [options.follow] The character whose class the dice follow (id of the cast)
   * @param {string|null} [options.target] The character whose own dice the window edits (id of the cast)
   */
  constructor({key, user = {}, follow = null, target = null}) {
    super({id: sampleId(MODULE_ID, key)});
    this.memory = new Map();
    this.userLook = user;
    this.actors = sampleActors(this.memory);
    const find = id => this.actors.find(actor => actor.id === `ssd-sample-${id}`) ?? null;
    this.followActor = find(follow);
    this.targetStub = find(target);
    markSample(this);
  }

  /** @override */
  get targetActor() {
    return this.targetStub;
  }

  /** @override */
  setTarget(actor) {
    const id = (typeof actor === "string") ? actor : actor?.id;
    this.targetStub = this.actors.find(entry => entry.id === id) ?? null;
  }

  /** @override */
  userChoice() {
    return this.userLook;
  }

  /** @override */
  lookActor() {
    return this.followActor;
  }

  /** @override */
  characterList() {
    return [...this.actors].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** @override */
  throwOptions() {
    const user = {color: game.user.color, getFlag: () => this.userChoice()};
    return {look: lookOf(user, {actor: this.targetActor ?? this.lookActor()}), sample: true};
  }

  /**
   * Keep a choice in memory (null: the look is taken away).
   * @param {object|null} actor
   * @param {object|null} choice
   */
  sampleSave(actor, choice) {
    if ( actor ) {
      if ( choice ) this.memory.set(actor.id, choice);
      else this.memory.delete(actor.id);
    }
    else this.userLook = choice ?? {};
  }
}

/**
 * Open "My dice" as a sample.
 * @param {object} options   See SampleMyDice
 * @returns {Promise<SampleMyDice>}
 */
async function openMyDiceSample(options) {
  const id = sampleId(MODULE_ID, options.key);
  await foundry.applications.instances.get(id)?.close({animate: false}).catch(() => {});
  const app = new SampleMyDice(options);
  await app.render({force: true});
  return app;
}

/* -------------------------------------------- */
/*  Throws on the table                         */
/* -------------------------------------------- */

/**
 * Throw dice in this browser only, like the test throw: no message, nobody else sees it.
 * @param {object[]} dice   From momentDice or diceToThrow
 * @param {object} look
 * @returns {object|null}
 */
function throwHere(dice, look) {
  dice.forEach((die, index) => {
    die.index = index;
    die.look = lookForDie(look, die.type);
  });
  return throwDice(dice, {
    seed: `sample:${foundry.utils.randomID()}`,
    startAt: performance.now() + 40,
    duration: throwDuration(),
    size: setting("size"),
    placement: setting("placement"),
    linger: setting("linger"),
    extra: 0,
    reducedMotion: !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    effects: effectsHere(),
    style: look.throw,
    sounds: setting("sounds")
  });
}

/** An element from HTML. */
function element(html, className = "") {
  const el = document.createElement("div");
  el.className = className;
  el.innerHTML = html;
  return el;
}

/** A select with the options of a list, the key chosen. */
function select(name, keys, current, label) {
  const options = keys.map(key => `<option value="${esc(key)}"${key === current ? " selected" : ""}>${esc(label(key))}</option>`);
  return `<select name="${name}">${options.join("")}</select>`;
}

/**
 * The window with the moments of the table: pick the triumph and the fumble, throw dice that show them. The choices
 * and the buttons work inside the sample (their own class lets the clicks through).
 * @returns {Promise<Application>}
 */
async function openMoments() {
  const state = {triumph: "fireworks", fumble: "skull"};
  const look = () => diceLook({userColor: game.user.color, allowOwn: true,
    choice: {...readyLook("wizard", {}), triumph: state.triumph, fumble: state.fumble}});
  const body = () => {
    const el = element(`<p>${esc(t("SSD.Sample.momentsIntro"))}</p>
      <div class="form-group"><label>${esc(t("SSD.MyDice.triumph"))}</label><div class="form-fields">
        ${select("triumph", TRIUMPHS, state.triumph, key => t(`SSD.MyDice.triumphs.${key}`))}
        <button type="button" data-throw="triumph">${esc(t("SSD.Sample.throwTriumph"))}</button></div></div>
      <div class="form-group"><label>${esc(t("SSD.MyDice.fumble"))}</label><div class="form-fields">
        ${select("fumble", FUMBLES, state.fumble, key => t(`SSD.MyDice.fumbles.${key}`))}
        <button type="button" data-throw="fumble">${esc(t("SSD.Sample.throwFumble"))}</button></div></div>
      <div class="form-group"><label></label><div class="form-fields">
        <button type="button" data-throw="both">${esc(t("SSD.Sample.throwBoth"))}</button></div></div>`, "sephral-sample-allowed");
    el.addEventListener("change", event => {
      if ( event.target.name in state ) state[event.target.name] = event.target.value;
    });
    el.addEventListener("click", event => {
      const kind = event.target.closest("[data-throw]")?.dataset.throw;
      if ( kind ) throwHere(momentDice(kind), look());
    });
    return el;
  };
  const app = await openSampleHtml({moduleId: MODULE_ID, id: "moments", title: t("SSD.Sample.moments"), body, width: 460});
  throwHere(momentDice("triumph"), look());
  return app;
}

/**
 * The GM's settings for big moments as the settings window shows them: the rule of a game system as a line of text, the
 * fields of the own rule, and a button that throws dice judged by what is picked.
 * @returns {Promise<Application>}
 */
async function openRule() {
  const systems = ruleSystems();
  const first = systems.find(entry => entry.key === "dnd5e") ?? systems[0];
  const state = {mode: "system", rule: first.key, die: "d20", triumph: "20", fumble: "1"};
  const titleOf = entry => entry.title || t("SSD.Sample.otherSystems");
  const body = () => {
    const modes = ["system", "custom", "none"];
    const rules = systems.map(entry => `<option value="${entry.key}"${entry.key === state.rule ? " selected" : ""}>${esc(titleOf(entry))}</option>`);
    const el = element(`
      <div class="form-group"><label>${esc(t("SSD.SETTINGS.moments.name"))}</label><div class="form-fields">
        ${select("mode", modes, state.mode, key => t(`SSD.SETTINGS.moments.${key}`))}</div>
        <p class="hint">${esc(t("SSD.SETTINGS.moments.hint"))}</p>
        <p class="hint ssd-rule"></p>
        <div class="form-fields" data-system><select name="rule">${rules.join("")}</select></div></div>
      <div class="form-group" data-own><label>${esc(t("SSD.SETTINGS.momentDie.name"))}</label><div class="form-fields">
        ${select("die", CUSTOM_DICE, state.die, key => t(`SSD.SETTINGS.momentDie.${key}`))}</div>
        <p class="hint">${esc(t("SSD.SETTINGS.momentDie.hint"))}</p></div>
      <div class="form-group" data-own><label>${esc(t("SSD.SETTINGS.momentTriumph.name"))}</label><div class="form-fields">
        <input type="text" name="triumph" value="${esc(state.triumph)}"></div>
        <p class="hint">${esc(t("SSD.SETTINGS.momentTriumph.hint"))}</p></div>
      <div class="form-group" data-own><label>${esc(t("SSD.SETTINGS.momentFumble.name"))}</label><div class="form-fields">
        <input type="text" name="fumble" value="${esc(state.fumble)}"></div>
        <p class="hint">${esc(t("SSD.SETTINGS.momentFumble.hint"))}</p></div>
      <div class="form-group"><div class="form-fields"><button type="button" data-throw>${esc(t("SSD.Sample.tryRule"))}</button></div></div>`,
    "sephral-sample-allowed");
    const refresh = () => {
      const entry = systems.find(item => item.key === state.rule);
      el.querySelector(".ssd-rule").textContent = t("SSD.SETTINGS.moments.rule", {
        system: titleOf(entry), rule: t(`SSD.Rules.${entry.key}`)});
      el.querySelector("[data-system]").hidden = state.mode !== "system";
      for ( const group of el.querySelectorAll("[data-own]") ) {
        group.classList.toggle("ssd-off", state.mode !== "custom");
        for ( const field of group.querySelectorAll("select, input") ) field.disabled = state.mode !== "custom";
      }
    };
    refresh();
    const take = event => {
      if ( event.target.name in state ) state[event.target.name] = event.target.value;
      refresh();
    };
    el.addEventListener("input", take);
    el.addEventListener("change", take);
    el.addEventListener("click", async event => {
      if ( !event.target.closest("[data-throw]") ) return;
      const entry = systems.find(item => item.key === state.rule);
      const judge = judgeFor({mode: state.mode, systemId: entry.systemId,
        custom: {die: state.die, triumph: state.triumph, fumble: state.fumble}});
      const faces = (state.mode === "custom") ? ruleFaces(state.die) : 20;
      const roll = await new foundry.dice.Roll(`6d${faces}`).evaluate();
      const {dice} = diceToThrow([roll], {maxDice: 6, judge});
      throwHere(dice, diceLook({userColor: game.user.color, allowOwn: true, choice: readyLook("wizard", {})}));
    });
    return el;
  };
  return openSampleHtml({moduleId: MODULE_ID, id: "rule", title: t("SSD.Sample.rule"), body, width: 520});
}

/* -------------------------------------------- */
/*  Lists                                       */
/* -------------------------------------------- */

/** The status lines of "My dice" for every kind of creature the dice can follow. */
async function openCreatures() {
  const body = () => {
    const lines = creatureKinds().map(kind => {
      const actor = creatureActor(kind);
      return `<li>${esc(t("SSD.MyDice.byClassFound", {name: actor.name, kind: t(`SSD.Creatures.${kind}`)}))}</li>`;
    });
    return element(`<p>${esc(t("SSD.Sample.creaturesIntro"))}</p><ul>${lines.join("")}</ul>`);
  };
  return openSampleHtml({moduleId: MODULE_ID, id: "creatures", title: t("SSD.Sample.creatures"), body, width: 480});
}

/** The entry in the menus of characters and the two keys of the module. */
async function openMenus() {
  const body = () => element(`<p>${esc(t("SSD.Sample.menuActor"))}</p>
    <ul><li><i class="fa-solid fa-dice"></i> ${esc(t("SSD.Actor.entry"))}</li></ul>
    <p>${esc(t("SSD.Sample.menuKeys"))}</p>
    <ul><li>${esc(t("SSD.Keys.openMyDice"))}</li><li>${esc(t("SSD.Keys.testThrow"))}</li></ul>`);
  return openSampleHtml({moduleId: MODULE_ID, id: "menus", title: t("SSD.Sample.menus"), body, width: 420});
}

/**
 * The sample windows of the module (api.samples).
 * @returns {{id: string, label: string, group: string, open: () => Promise<object>}[]}
 */
export function sampleWindows() {
  const dice = t("SSD.MyDice.title");
  const wizard = {...readyLook("wizard", {}), byClass: true};
  const entry = (id, label, group, open) => ({id, label, group, open});
  const mine = (key, options) => () => openMyDiceSample({key, ...options});
  return [
    entry("my-dice-class", t("SSD.Sample.myDiceClass"), dice, mine("my-dice-class", {user: wizard, follow: "mira"})),
    entry("my-dice-unknown", t("SSD.Sample.myDiceUnknown"), dice, mine("my-dice-unknown", {user: {byClass: true}, follow: "bandit1"})),
    entry("my-dice-character-own", t("SSD.Sample.characterOwn"), dice, mine("my-dice-character-own", {user: wizard, follow: "mira", target: "ari"})),
    entry("my-dice-character-none", t("SSD.Sample.characterNone"), dice, mine("my-dice-character-none", {user: wizard, follow: "mira", target: "mira"})),
    entry("creatures", t("SSD.Sample.creatures"), dice, openCreatures),
    entry("moments", t("SSD.Sample.moments"), t("SSD.Sample.groupMoments"), openMoments),
    entry("rule", t("SSD.Sample.rule"), t("SSD.Sample.groupMoments"), openRule),
    entry("menus", t("SSD.Sample.menus"), t("SSD.Sample.groupMore"), openMenus)
  ];
}
