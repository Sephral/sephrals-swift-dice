/**
 * Self-test: what the module relies on in the browser (CSS 3D, clipped faces, Web Animations) and in Foundry (dice
 * terms, roll data, chat message visibility), the dice solids, the settings and texts, and a test die built in the
 * page.
 */

import {MODULE_ID, TESTED_VERSIONS, diceSoNiceActive, esc, t} from "./config.mjs";
import {dieModel} from "./geometry.mjs";
import {buildDie} from "./render.mjs";
import {diceToThrow} from "./rolls.mjs";
import {diceLook} from "./colors.mjs";
import {seededRandom} from "./motion.mjs";

/** Faces per die type, to check the solids. */
const FACES = {d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, coin: 2};

/**
 * Run all checks.
 * @returns {Promise<{problems: string[], checks: number}>}
 */
async function checkAll() {
  const problems = [];
  let checks = 0;
  const check = (ok, key, data) => {
    checks++;
    if ( !ok ) problems.push(game.i18n.has(key) ? t(key, data) : key);
  };
  check(!diceSoNiceActive(), "SSD.SELFTEST.DiceSoNice");
  check(!!globalThis.CSS?.supports?.("transform-style", "preserve-3d"), "SSD.SELFTEST.Css3d");
  check(!!globalThis.CSS?.supports?.("clip-path", "polygon(0 0, 1px 0, 0 1px)"), "SSD.SELFTEST.ClipPath");
  check(typeof Element.prototype.animate === "function", "SSD.SELFTEST.Animations");
  const Die = foundry.dice?.terms?.Die;
  check(!!Die && !!foundry.dice?.Roll?.fromData, "SSD.SELFTEST.DiceApi");
  const messageClass = ChatMessage.implementation;
  check(["visible", "isContentVisible", "isAuthor"].every(key => key in messageClass.prototype)
    && (typeof messageClass.getSpeakerActor === "function"), "SSD.SELFTEST.Messages");
  for ( const [type, faces] of Object.entries(FACES) ) {
    let count = 0;
    try {
      count = dieModel(type).faces.filter(f => f.kind === "face").length;
    } catch {
      count = 0;
    }
    check(count === faces, "SSD.SELFTEST.Solid", {type});
  }
  // A real roll, its dice and one die built in the page
  try {
    const roll = await new foundry.dice.Roll("1d20 + 2d6 + 1d100").evaluate();
    const {dice} = diceToThrow([roll], {maxDice: 20});
    check(dice.length === 5, "SSD.SELFTEST.Roll");
    const look = diceLook({userColor: game.user.color});
    const built = buildDie(dice[0], look, {unit: 20, rand: seededRandom("self-test")});
    check(built.faces.length === 20, "SSD.SELFTEST.Build");
  } catch(err) {
    console.error(`${MODULE_ID} | self-test`, err);
    check(false, "SSD.SELFTEST.Roll");
  }
  for ( const key of ["enabled", "placement", "reveal", "speed", "colors", "hiddenRolls", "maxDice"] ) {
    check(game.settings.settings.has(`${MODULE_ID}.${key}`), "SSD.SELFTEST.Storage", {key});
  }
  const keys = ["SSD.MyDice.title", "SSD.SETTINGS.reveal.name", "SSD.Notice.diceSoNice"];
  const missing = keys.filter(key => !game.i18n.has(key));
  check(!missing.length, "SSD.SELFTEST.Texts", {keys: missing.join(", ")});
  return {problems, checks};
}

/**
 * Run the self-test and report the result.
 * @param {object} [options]
 * @param {boolean} [options.report=true]
 * @returns {Promise<{problems: string[], checks: number}>}
 */
export async function runSelfTest({report = true} = {}) {
  const {problems, checks} = await checkAll();
  const summary = problems.length ? t("SSD.SELFTEST.Problems", {problems: problems.length, checks})
    : t("SSD.SELFTEST.Passed", {checks});
  if ( problems.length ) ui.notifications.warn(summary, {permanent: true});
  else ui.notifications.info(summary);
  if ( report ) {
    const versions = t("SSD.SELFTEST.Version", {current: game.version, tested: TESTED_VERSIONS.core});
    let content = `<h3>${esc(t("SSD.SELFTEST.Title"))}</h3><p>${esc(summary)}</p><p><small>${esc(versions)}</small></p>`;
    if ( problems.length ) content += `<ul>${problems.map(p => `<li>${esc(p)}</li>`).join("")}</ul>`;
    await ChatMessage.implementation.create({content, whisper: [game.user.id],
      speaker: {alias: game.modules.get(MODULE_ID).title}});
  }
  return {problems, checks};
}

/**
 * Tell the GM once when Foundry is newer than the version the module was verified against.
 */
export function noticeNewVersions() {
  if ( !game.user.isGM ) return;
  if ( !foundry.utils.isNewerVersion(game.version, TESTED_VERSIONS.core) ) return;
  const signature = `core ${game.version}`;
  if ( game.settings.get(MODULE_ID, "acknowledgedVersions") === signature ) return;
  game.settings.set(MODULE_ID, "acknowledgedVersions", signature);
  ui.notifications.info(t("SSD.SELFTEST.NewVersions", {versions: signature}), {permanent: true});
}
