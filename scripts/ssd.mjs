import {MODULE_ID, TESTED_VERSIONS, diceSoNiceActive, setting, t} from "./config.mjs";
import {chatState, describeMessage, isActive, registerChat, rollsOf, waitForReveal} from "./chat.mjs";
import {readyLook} from "./colors.mjs";
import {registerDebug} from "./debug.mjs";
import {saveDebugFile} from "./debug-file.mjs";
import {frameRate, watchFrameRate} from "./fps.mjs";
import {registerHubModule} from "./hub.mjs";
import {applyModuleLanguage} from "./language.mjs";
import {openMyDice, refreshMyDice, testThrow} from "./my-dice-app.mjs";
import {noticeNewVersions, runSelfTest} from "./selftest.mjs";
import {changeLanguage, decorateSettings, registerSettings} from "./settings.mjs";
import {clearTable, tableState} from "./tray.mjs";
import {registerUsage} from "./usage.mjs";

Hooks.once("init", () => {
  registerHubModule({moduleId: MODULE_ID, tested: TESTED_VERSIONS});
  registerSettings({
    language: value => changeLanguage(value, refreshMyDice),
    clear: () => clearTable(),
    controls: () => ui.controls?.render?.({reset: true}),
    openMyDice
  });
  // Counted only on the active GM's client, like every Sephral module
  registerUsage(MODULE_ID, {
    features: ["thrown", "covered", "added", "myDice", "ownColor", "testThrow", "surprise", "classLook", "byClass",
      "resetLook"],
    settings: ["reveal", "speed", "colors", "initiative", "npcRolls", "hiddenRolls", "moments", "effects", "maxDice",
      "minFps", "placement", "size", "deviceEffects", "sceneControl"]
  });
  registerDebug({
    state: () => ({...chatState(), table: tableState()}),
    message: describeMessage
  });
  registerChat();
  registerKeys();
  game.modules.get(MODULE_ID).api = {
    /** Open the window "My dice". */
    open: openMyDice,
    /** Throw dice in this browser only, without a chat message (formula like "2d6 + 1d20"). */
    testThrow,
    /**
     * Wait until the result of a chat message shows. Resolves at once when its card does not wait for dice, and
     * after a few seconds at the latest.
     */
    waitForReveal: messageId => waitForReveal(messageId?.id ?? messageId),
    /** Does this browser throw dice (off while Dice So Nice is active or on this device)? */
    isActive,
    /** Take all dice off the table in this browser. */
    clearTable,
    /** The frame rate of this browser over the last seconds (null while unknown or without a canvas). */
    frameRate: () => frameRate(),
    /** The rolls of a chat message the module reads, Ready Set Roll cards included. */
    rollsOf,
    /**
     * The choice of a ready look, a class or a creature (for example "nebula", "druid", "undead"), to store as the
     * user's look: game.user.setFlag("sephrals-swift-dice", "look", api.readyLook("druid")).
     */
    readyLook: key => readyLook(key, {}),
    /** Check the module (GM). */
    runSelfTest,
    /** Save the debug file of Sephral's modules (GM). */
    saveDebugFile: messageId => saveDebugFile(messageId ?? null, {moduleId: MODULE_ID})
  };
});

/** Applying a fixed module language loads its file; the rest of "ready" waits for it. */
let languageReady = Promise.resolve();

Hooks.once("i18nInit", () => {
  languageReady = applyModuleLanguage(game.settings.get(MODULE_ID, "uiLanguage"));
});

Hooks.once("ready", async () => {
  await languageReady;
  noticeNewVersions();
  noticeDiceSoNice();
});

Hooks.on("canvasReady", () => watchFrameRate());
Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
Hooks.on("renderSettingsConfig", (app, html) => decorateSettings(html));

Hooks.on("updateUser", (user, changed) => {
  if ( (user.id === game.user.id) && (("color" in changed) || ("character" in changed)
    || foundry.utils.hasProperty(changed, `flags.${MODULE_ID}`)) ) refreshMyDice();
});
// The dice can follow the class of the selected token: My dice shows whose class it found
Hooks.on("controlToken", () => refreshMyDice());
Hooks.on("updateSetting", setting => {
  if ( setting.key === `${MODULE_ID}.colors` ) refreshMyDice();
});

/** The name of the tool in the token controls. */
const TOOL = "ssdMyDice";

/**
 * Hook "getSceneControlButtons": My dice in the token controls, for every user. Not while Dice So Nice throws the
 * dice instead.
 * @param {Record<string, object>|object[]} controls
 */
function onGetSceneControlButtons(controls) {
  if ( diceSoNiceActive() ) return;
  try {
    if ( !setting("sceneControl") ) return;
  } catch {}
  const tokens = controls?.tokens ?? (Array.isArray(controls) ? controls.find(c => c.name === "token") : null);
  if ( !tokens ) return;
  const tool = {
    name: TOOL,
    title: t("SSD.MyDice.title"),
    icon: "fa-solid fa-dice",
    button: true,
    visible: true,
    onChange: () => openMyDice()
  };
  if ( Array.isArray(tokens.tools) ) tokens.tools.push({...tool, onClick: tool.onChange});
  else {
    tool.order = Object.keys(tokens.tools ?? {}).length;
    tokens.tools[TOOL] = tool;
  }
}

/**
 * Tell the GM once that Swift Dice stays off while Dice So Nice is active.
 */
function noticeDiceSoNice() {
  if ( !game.user.isGM || !diceSoNiceActive() || setting("diceSoNiceNotice") ) return;
  game.settings.set(MODULE_ID, "diceSoNiceNotice", true);
  ui.notifications.info(t("SSD.Notice.diceSoNice"), {permanent: true});
}

/**
 * The keys: open "My dice" and a test throw. No default keys, every user picks them in Foundry's key settings.
 */
function registerKeys() {
  game.keybindings.register(MODULE_ID, "openMyDice", {
    name: "SSD.Keys.openMyDice",
    editable: [],
    onDown: () => {
      openMyDice();
      return true;
    }
  });
  game.keybindings.register(MODULE_ID, "testThrow", {
    name: "SSD.Keys.testThrow",
    editable: [],
    onDown: () => {
      testThrow();
      return true;
    }
  });
}
