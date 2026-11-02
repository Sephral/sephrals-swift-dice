/**
 * Roll messages in the chat: which dice to throw, whose look they get, and the short wait of the card.
 *
 * The card never waits for the animation. When it should wait for the dice, its content is hidden for exactly the
 * length of a throw by a timer, plus a style that shows it again on its own after a few seconds. If a throw fails,
 * or this tab is in the background, the result still appears. Every browser starts the throw when the message
 * arrives, so everyone sees the same throw land at nearly the same moment.
 */

import {DURATIONS, LOOK_FLAG, MODULE_ID, diceSoNiceActive, setting} from "./config.mjs";
import {themeOf} from "./classes.mjs";
import {diceLook, lookForDie, readyLook} from "./colors.mjs";
import {trace} from "./debug.mjs";
import {frameRate, tooSlow} from "./fps.mjs";
import {diceToThrow, messageRolls} from "./rolls.mjs";
import {judgeFor} from "./systems.mjs";
import {throwDice} from "./tray.mjs";
import {countFeature} from "./usage.mjs";

/** Milliseconds between the message arriving and the dice leaving the hand (time to build them). */
const LEAD = 60;

/** Milliseconds the card waits after the dice landed, so the eye is on the dice first. */
const TAIL = 120;

/** Messages older than this are not thrown when an update brings rolls (an old card got changed). */
const OLD_MS = 60_000;

/** Cards waiting for their dice: message id to {revealAt, timer}. */
const waiting = new Map();

/** Rolls already thrown per message, so an update only throws the new ones. */
const thrown = new Map();
const THROWN_LIMIT = 300;

/** What the module did with recent messages (for the debug file). */
const decisions = new Map();

/* -------------------------------------------- */

/**
 * Listen to the chat. Call in "init".
 */
export function registerChat() {
  Hooks.on("createChatMessage", message => attempt(() => onCreate(message)));
  Hooks.on("updateChatMessage", (message, changed) => attempt(() => onUpdate(message, changed)));
  Hooks.on("renderChatMessageHTML", (message, html) => attempt(() => onRender(message, html)));
  document.addEventListener("visibilitychange", () => {
    if ( !document.hidden ) revealDue();
  });
}

/**
 * Run a hook handler and keep its error from Foundry's hook chain.
 * @param {Function} fn
 */
function attempt(fn) {
  try {
    fn();
  } catch(err) {
    console.error(`${MODULE_ID} |`, err);
    trace.add("error", {message: String(err?.message ?? err)});
  }
}

/**
 * Does the module throw dice in this browser?
 * @returns {boolean}
 */
export function isActive() {
  return !diceSoNiceActive() && !!setting("enabled");
}

/**
 * The rolls of a message as Roll objects.
 * @param {ChatMessage} message
 * @returns {Roll[]}
 */
export function rollsOf(message) {
  const Roll = foundry.dice.Roll;
  return messageRolls(message, data => {
    if ( data instanceof Roll ) return data;
    try {
      return Roll.fromData(data);
    } catch {
      return data;
    }
  });
}

/**
 * Who sees what of a message in this browser.
 * @param {ChatMessage} message
 * @returns {{show: boolean, covered?: boolean, reason: string}}
 */
export function decide(message) {
  if ( !message.visible ) return {show: false, reason: "notVisible"};
  if ( message.getFlag?.("core", "initiativeRoll") && !setting("initiative") ) return {show: false, reason: "initiative"};
  if ( !setting("npcRolls") ) {
    const actor = ChatMessage.implementation.getSpeakerActor(message.speaker);
    if ( actor && !actor.hasPlayerOwner ) return {show: false, reason: "npc"};
  }
  if ( !message.isContentVisible ) {
    const mode = setting("hiddenRolls");
    if ( (mode === "all") || ((mode === "own") && message.isAuthor) ) return {show: true, covered: true, reason: "covered"};
    return {show: false, reason: "hidden"};
  }
  return {show: true, covered: false, reason: "visible"};
}

/**
 * The look of a user's dice. A user who lets the dice follow the class gets the look of the character who rolls
 * (its class, or what kind of creature it is), and their own look for anyone else.
 * @param {User|null} user
 * @param {object} [options]
 * @param {Actor|null} [options.actor]   The character who rolls
 * @returns {object}
 */
export function lookOf(user, {actor = null} = {}) {
  let choice = user?.getFlag?.(MODULE_ID, LOOK_FLAG) ?? {};
  if ( choice.byClass && actor ) {
    const theme = themeOf(actor);
    const ready = theme ? readyLook(theme.key, choice) : null;
    if ( ready ) choice = ready;
  }
  return diceLook({userColor: user?.color, choice, allowOwn: setting("colors") === "choice"});
}

/**
 * Which results are a triumph or a fumble at this table: the game system's rule, the GM's own, or none.
 * @returns {(roll: object) => Map}
 */
export function tableJudge() {
  return judgeFor({mode: setting("moments"), systemId: game.system?.id,
    custom: {die: setting("momentDie"), triumph: setting("momentTriumph"), fumble: setting("momentFumble")}});
}

/**
 * Which light and particle effects play on this screen: the GM's choice for the table, and each device can switch
 * them off.
 * @returns {{glow: boolean, trails: boolean, bursts: boolean}}
 */
export function effectsHere() {
  const mode = setting("effects");
  if ( !setting("deviceEffects") || (mode === "none") ) return {glow: false, trails: false, bursts: false};
  if ( mode === "crits" ) return {glow: false, trails: false, bursts: true};
  return {glow: true, trails: true, bursts: true};
}

/**
 * The milliseconds of a throw.
 * @returns {number}
 */
export function throwDuration() {
  return DURATIONS[setting("speed")] ?? DURATIONS.normal;
}

/* -------------------------------------------- */

/**
 * A new message: throw its rolls.
 * @param {ChatMessage} message
 */
function onCreate(message) {
  if ( diceSoNiceActive() ) return;
  const rolls = rollsOf(message);
  remember(message.id, rolls.length);
  if ( !rolls.length || !setting("enabled") ) return;
  play(message, rolls, {seed: `${message.id}:0`, wait: setting("reveal") === "dice"});
}

/**
 * A changed message: throw the rolls it brought (Midi-QOL and Ready Set Roll add rolls to cards they made).
 * @param {ChatMessage} message
 * @param {object} changed
 */
function onUpdate(message, changed) {
  if ( diceSoNiceActive() ) return;
  const brought = Array.isArray(changed?.rolls) || Array.isArray(changed?.flags?.rsr5e?.rolls);
  if ( !brought ) return;
  const rolls = rollsOf(message);
  const known = thrown.has(message.id);
  const before = thrown.get(message.id) ?? 0;
  remember(message.id, rolls.length);
  if ( rolls.length <= before ) return;
  if ( !known && ((Date.now() - (message.timestamp ?? 0)) > OLD_MS) ) return;
  if ( !setting("enabled") ) return;
  play(message, rolls.slice(before), {seed: `${message.id}:${before}`, wait: false, added: true});
}

/**
 * A card was drawn: hide its result while its dice are still rolling.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function onRender(message, html) {
  const entry = waiting.get(message.id);
  if ( entry && (performance.now() < entry.revealAt) ) html?.classList?.add("ssd-waiting");
}

/**
 * Keep the number of thrown rolls of a message, forgetting the oldest.
 * @param {string} id
 * @param {number} count
 */
function remember(id, count) {
  thrown.delete(id);
  thrown.set(id, count);
  if ( thrown.size > THROWN_LIMIT ) thrown.delete(thrown.keys().next().value);
}

/**
 * Throw the dice of some rolls of a message.
 * @param {ChatMessage} message
 * @param {Roll[]} rolls
 * @param {object} options
 * @param {string} options.seed
 * @param {boolean} options.wait     Should the card wait for the dice
 * @param {boolean} [options.added]  Rolls added to an existing card
 */
function play(message, rolls, {seed, wait, added = false}) {
  const decision = decide(message);
  const note = {messageId: message.id, reason: decision.reason, rolls: rolls.length};
  if ( !decision.show ) {
    record(message.id, {...note, shown: false});
    trace.add("skip", note);
    return;
  }
  if ( document.hidden ) {
    record(message.id, {...note, shown: false, reason: "hiddenTab"});
    trace.add("skip", {...note, reason: "hiddenTab"});
    return;
  }
  // A slow screen skips the dice (GM setting), its card shows at once
  if ( tooSlow(setting("minFps")) ) {
    const fps = Math.round(frameRate() ?? 0);
    record(message.id, {...note, shown: false, reason: "slowScreen", fps});
    trace.add("skip", {...note, reason: "slowScreen", fps});
    return;
  }
  const {dice, extra} = diceToThrow(rolls, {maxDice: setting("maxDice"), judge: tableJudge()});
  if ( !dice.length ) {
    record(message.id, {...note, shown: false, reason: "noDice"});
    return;
  }
  const look = lookOf(message.author, {actor: ChatMessage.implementation.getSpeakerActor(message.speaker)});
  for ( const die of dice ) {
    die.look = lookForDie(look, die.type);
    die.covered = !!decision.covered;
    if ( die.covered ) die.glow = null;
  }
  const duration = throwDuration();
  const startAt = performance.now() + LEAD;
  if ( wait && !decision.covered ) holdCard(message.id, startAt + duration + TAIL);
  const done = throwDice(dice, {
    seed,
    startAt,
    duration,
    size: setting("size"),
    placement: setting("placement"),
    linger: setting("linger"),
    extra,
    reducedMotion: !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    effects: effectsHere(),
    style: look.throw,
    sounds: setting("sounds")
  });
  const info = {...note, shown: !!done, dice: dice.length, extra, covered: !!decision.covered, waited: wait, added,
    seed};
  record(message.id, info);
  trace.add(done ? "throw" : "late", info);
  if ( done ) countFeature(MODULE_ID, decision.covered ? "covered" : (added ? "added" : "thrown"));
}

/**
 * Keep what happened with a message.
 * @param {string} id
 * @param {object} info
 */
function record(id, info) {
  decisions.delete(id);
  decisions.set(id, {...info, at: new Date().toISOString()});
  if ( decisions.size > 60 ) decisions.delete(decisions.keys().next().value);
}

/* -------------------------------------------- */
/*  The short wait of the card                  */
/* -------------------------------------------- */

/**
 * Hide the result of a card until a moment.
 * @param {string} id
 * @param {number} revealAt   performance.now() time
 */
function holdCard(id, revealAt) {
  const previous = waiting.get(id);
  if ( previous ) clearTimeout(previous.timer);
  const timer = setTimeout(() => revealCard(id), Math.max(0, revealAt - performance.now()));
  waiting.set(id, {revealAt, timer});
  for ( const el of document.querySelectorAll(`[data-message-id="${CSS.escape(id)}"]`) ) el.classList.add("ssd-waiting");
}

/**
 * Show the result of a card.
 * @param {string} id
 */
export function revealCard(id) {
  const entry = waiting.get(id);
  if ( entry ) clearTimeout(entry.timer);
  waiting.delete(id);
  for ( const el of document.querySelectorAll(`[data-message-id="${CSS.escape(id)}"]`) ) el.classList.remove("ssd-waiting");
  const message = game.messages.get(id);
  if ( message ) Hooks.callAll(`${MODULE_ID}.revealed`, message);
}

/**
 * Show every card whose time has come (timers are slowed down in background tabs).
 */
function revealDue() {
  const now = performance.now();
  for ( const [id, entry] of waiting ) if ( entry.revealAt <= now ) revealCard(id);
}

/**
 * Wait until the result of a message is shown. Resolves at once when its card does not wait, and after a few seconds
 * at the latest, so nobody waits forever.
 * @param {string} id
 * @returns {Promise<boolean>}   True when the card waited for dice
 */
export function waitForReveal(id) {
  const entry = waiting.get(id);
  if ( !entry ) return Promise.resolve(false);
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if ( done ) return;
      done = true;
      Hooks.off(`${MODULE_ID}.revealed`, hook);
      resolve(true);
    };
    const hook = Hooks.on(`${MODULE_ID}.revealed`, message => {
      if ( message?.id === id ) finish();
    });
    setTimeout(finish, Math.max(0, entry.revealAt - performance.now()) + 500);
  });
}

/**
 * What the module made of a message (for the debug file).
 * @param {ChatMessage} message
 * @returns {object}
 */
export function describeMessage(message) {
  const rolls = rollsOf(message);
  return {
    rolls: rolls.length,
    dice: diceToThrow(rolls, {maxDice: 50, judge: tableJudge()}).dice.map(d => ({type: d.type, value: d.value,
      faded: d.faded, glow: d.glow})),
    decision: decide(message),
    happened: decisions.get(message.id) ?? null,
    waiting: waiting.has(message.id)
  };
}

/**
 * The module state for the debug file.
 * @returns {object}
 */
export function chatState() {
  return {waitingCards: waiting.size, fps: frameRate(),
    recent: [...decisions.entries()].slice(-12).map(([id, info]) => ({id, ...info}))};
}

export const __test__ = {LEAD, TAIL, waiting, thrown};
