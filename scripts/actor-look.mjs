/**
 * Dice per character: entries that open "My dice" for one character, in the header of its sheet and in the context
 * menu of the actors. Only owners see them, only owners may store a look on the actor (Foundry's permissions).
 */

import {MODULE_ID, diceSoNiceActive, t} from "./config.mjs";
import {openMyDice} from "./my-dice-app.mjs";

const ACTION = "ssdActorDice";
const ICON_HTML = "<i class=\"fa-solid fa-dice\"></i>";

/**
 * May the user give this character a look, and is the module on?
 * @param {Actor|null} actor
 * @returns {boolean}
 */
function allowed(actor) {
  return !!actor && actor.isOwner && !diceSoNiceActive();
}

/**
 * Hook "getHeaderControlsApplicationV2": one entry in the header menu of actor sheets.
 * @param {object} app
 * @param {object[]} controls
 */
function onHeaderControls(app, controls) {
  const actor = (app?.document?.documentName === "Actor") ? app.document : null;
  if ( !allowed(actor) || !Array.isArray(controls) ) return;
  if ( controls.some(control => control.action === ACTION) ) return;
  controls.push({
    action: ACTION,
    icon: "fa-solid fa-dice",
    label: t("SSD.Actor.entry"),
    visible: () => allowed(actor),
    onClick: () => openMyDice({actor})
  });
}

/**
 * Hook "getActorContextOptions": one entry for the actors of the directory (both key sets, v13 and v14).
 * @param {object} app
 * @param {object[]} entries
 */
function onContextOptions(app, entries) {
  if ( !Array.isArray(entries) || entries.some(entry => entry?.ssdActorDice) ) return;
  const find = li => {
    const id = li?.dataset?.entryId ?? li?.dataset?.documentId ?? li?.closest?.("[data-entry-id]")?.dataset?.entryId;
    return id ? (game.actors?.get(id) ?? null) : null;
  };
  entries.push({
    ssdActorDice: true,
    name: t("SSD.Actor.entry"),
    label: t("SSD.Actor.entry"),
    icon: ICON_HTML,
    condition: li => allowed(find(li)),
    visible: li => allowed(find(li)),
    callback: li => openMyDice({actor: find(li)}),
    onClick: (event, li) => openMyDice({actor: find(li)})
  });
}

/**
 * Register the hooks, at init (the sidebar renders before ready).
 */
export function registerActorLook() {
  Hooks.on("getHeaderControlsApplicationV2", onHeaderControls);
  Hooks.on("getActorContextOptions", onContextOptions);
  // A look that changed on the actor redraws the window
  Hooks.on("updateActor", (actor, changed) => {
    if ( foundry.utils.hasProperty(changed, `flags.${MODULE_ID}`) ) {
      const app = foundry.applications.instances.get("ssd-my-dice");
      if ( app?.rendered ) app.render();
    }
  });
}
