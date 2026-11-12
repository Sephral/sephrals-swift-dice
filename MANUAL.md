# Sephral’s Swift Dice: Manual

Swift Dice throws 3D dice for every roll in the chat. The dice are drawn by the browser itself, without WebGL and without a physics engine, so they run on weak computers, tablets and in Firefox. The chat card never depends on them: it always appears, and its result always shows.

## A throw

* **When:** a chat message with rolls arrives. Every screen starts the throw the moment the message arrives, so all players see the dice land together. The way the dice tumble is the same on every screen.
* **The card:** with *Results in the chat* on *When the dice have landed* (the default), the card appears at once and its result stays covered while the dice roll. The wait is never longer than the throw itself (plus the throws before it, see below), and shortly after that the result shows in any case. With *At once* the card shows its result right away and the dice roll along.
* **One throw after the other:** a roll that comes while dice are still rolling waits until they lie still, and its card only comes into the chat when its dice leave the hand. Attack and damage, or an attack and the automatic damage of a system or module, land one after the other, so nobody reads the hit from the number of damage dice or from a damage card that is already there. A throw waits at most 4 seconds, after that the next ones start at once. Every screen gets the rolls in the same order, so all see the same sequence. The GM turns it off with *One throw after the other*.
* **Rolls added later:** cards that get their rolls after they appear (Midi QOL attacks and damage, for example) throw the new dice when they arrive. Their card does not wait.
* **Where:** beside the chat, left of the sidebar or of the column with new chat messages, and above the macro bar, so the dice cover no tokens. Or in the middle of the screen (setting *Where the dice fall*). Quick rolls in a row land next to each other.
* **Which dice:** d4, d6, d8, d10, d12 and d20 as real shapes, a d100 as a tens die and a ones die, d3 and Fate dice on a d6, coins and other dice as a flat token with the number. Dropped or rerolled dice (advantage, rerolls) fade when they land. A die with a minimum or maximum (`1d20min10`, Reliable Talent) shows the number that counts. Large throws show *Dice per throw* dice and a counter for the rest.
* **Glow:** a gold glow on a triumph and a red one on a fumble. What counts as one depends on the game, see *Big moments*.
* **Reduced motion:** when the operating system asks for reduced motion, the dice appear at their place without a throw.
* **Background tabs:** a browser tab in the background throws nothing and shows the result at once.

## Who sees which dice

| Roll | The one who rolled | The GM | Other players |
| --- | --- | --- | --- |
| Public | Dice | Dice | Dice |
| Private to the GM, self roll | Dice | Dice | Nothing |
| Blind | Covered dice with question marks | Dice | Nothing |

*Hidden rolls* changes the covered dice: *Covered dice for everyone who sees the card* also shows them to players who see the card of a hidden roll, *No dice* shows none.

## Big moments

Not every game counts a 20 as good. The game system sets the rule by default, and the setting *Big moments* names it under the field. The GM can switch to a rule of their own or turn the moments off.

| Game system | Triumph | Fumble |
| --- | --- | --- |
| D&D 5e | a critical hit as the system reports it, also a wider critical range like 19 to 20 (damage rolls have none) | a critical miss |
| Pathfinder 2e | a critical success against a DC, also without a natural 20 (without a DC a natural 20) | a critical failure (without a DC a natural 1) |
| Savage Worlds | a raise on a trait roll, on the die that made it | a critical failure, snake eyes |
| Crucible | a check that beats the DC by more than 6 | a check that misses the DC by 6 or more |
| Daggerheart | hope and fear dice with the same number | none |
| Call of Cthulhu, Delta Green, Warhammer Fantasy, Dark Heresy, Imperium Maledictum, BRP, Mythras, RuneQuest | 01 on the d100 | 100 |
| Dragonbane, Symbaroum, Cairn | a 1 on the d20 | a 20 |
| Cyberpunk RED | a 10 on the d10 | a 1 |
| Blades in the Dark | two or more sixes | none |
| Alien, Forbidden Lands, Vaesen, Twilight 2000, Blade Runner | every six | none |
| Fate | four plus signs | four minus signs |
| Powered by the Apocalypse, Dungeon World | a double six | a double one |
| Cypher System | 19 or 20 | 1 |
| GURPS | 3 or 4 on three dice | 17 or 18 |
| Draw Steel | a natural 19 or 20 on a power roll | none |
| Shadowrun 5 and 6 | none | a glitch, more than half of the dice show a 1 |
| Star Wars (FFG), Genesys | none, their dice show symbols | none |
| every other system | a natural 20 on a d20 | a natural 1 on a d20 |

Rolls typed into the chat (`/r 1d20`) follow the same rule. Every die that counts glows, and each moment plays once per throw, so three sixes in a pool do not set off three fireworks.

**A rule of your own:** set *Big moments* to *My own rule* and fill in the three fields below it: the die that decides (d20, d100, d12, d10, d8, d6, d4 or every die with numbers), the results that are a triumph and those that are a fumble. Results are numbers, ranges and lists like `20`, `19-20` or `1, 2`, and `max` is the highest number of each die. An empty field means none. The fields start with the rule of the game system and stay greyed out while another rule is picked.

## My dice

Every user opens *My dice* with the dice button in the token controls on the left, in the module settings or with a key (see below). The choice is saved with the user, so everyone at the table sees these dice the same way. A test throw shows them on your screen only.

* **Ready looks:** thirty looks with color, pattern, material, effects and often a way of throwing (Ivory, Obsidian, Gold, Blood, Emerald, Sapphire, Amethyst, Bone, Frost, Steel, Witchlight, Phoenix, Seer, Nebula, Magma, Oak, Dragon, Angel, Crypt, Party, Winter, Pirate, Sweetheart, Arcane, Thunder, Grove, Sun, Night, Ink and paper, Carbon).
* **Classes:** seventeen looks of fantasy classes, where every part tells the class: Barbarian (blood red stone, drops of blood, rage, a quake, slammed on the table, a roar), Bard (pearl, music notes, a melody circling the die, a chord, from a hand, applause and roses), Cleric (frosted glass with a sun inside, a halo, a holy circle, down a beam of light), Druid (jade with a leaf inside, leaves, vines, flowers, on a gust of wind, a ring of flowers, wilting leaves), Fighter (steel, sparks, a shield of light, crossed blades, a crown), Monk (jade with yin and yang inside, gusts of wind, ki, on a gust of wind), Paladin (gold, wings, a holy circle, down a beam of light, a smiting hammer), Ranger (wood, feathers, the hunter's mark, arrows, shot from a bow), Rogue (frosted glass with a mask inside, smoke and shadows, teleported), Sorcerer (crystal with a swirl, rainbow light, twinkling stars, fireworks, a spell that fizzles), Warlock (dark glass with an eye, bats, tentacles, runes, through a portal), Wizard (galaxy, runes, a circle of runes, through a portal), Artificer (brass, cogs, turning gears, steam, from a cannon), Necromancer (frosted glass with a skull, ghosts, shadows, bones), Witch (glass with the moon, bubbles, tipped from a cauldron), Alchemist (glass with a flask, bubbles, steam) and Psion (crystal with a brain, ripples, teleported).
* **My dice follow the class of the character who rolls:** with this on, each roll takes the look of the class of the character who rolls it. The class comes from what the game system keeps: the classes of a D&D 5e character (the one with the most levels), the class of a PF2e character, class items of other systems, the arcane background in Savage Worlds, or a class written on the character. Names are found in English and German, so homebrew classes like *Kriegerin* or *Death Knight* find their look too, and many other classes find the nearest one (Champion as Paladin, Thaumaturge as Warlock, Gunslinger as Ranger). Creatures without a class take the look of what they are: undead the Necromancer's, fiends lava, celestials the Angel, dragons the Dragon, fey the Druid look, elementals Thunder, constructs the Artificer's, plants and beasts Oak, aberrations the Warlock's, oozes Witchlight. A roll without a character, or by one without a class, keeps your own look. Under the checkbox the window names the character it found (the selected token, or your assigned character) and its class. For a GM this gives monsters the look of their kind.
* **Surprise me:** rolls a new look with material, pattern, effects and now and then colors of their own, way of throwing, big moments, font and, when the GM allows own colors, colors. Every click gives a new one, it is stored at once like any other choice.
* **Reset:** back to dice in your player color without effects.
* **Color:** your player color from Foundry's user configuration (the default), or a color of your own. The second color, the light and the effects follow the die color until you pick colors for them, so dice in the player color follow it completely. Taking *My player color* again sets the second color and the light back to automatic.
* **My d20 in its own color:** your d20 gets a color of its own.
* **Pattern:** none, blend, speckled, marble, stripes, dots, checker, scales, swirl or starry, in a second color.
* **Colors of their own:** next to the pattern, the inside, the way of throwing, the glow, the trail, the aura and the landing sits a color field. While it is automatic (lighter, with a dashed rim) it shows the color the effect has and follows the die or its light. Pick a color and that effect takes it: leaves, coins, embers and smoke too, which otherwise keep their natural colors. The small cross next to the field makes it automatic again.
* **Material:** glossy, matte, metal, chrome, glass, crystal, frosted glass, ice, jade, pearl, holographic, wood, stone, carbon, parchment, lava, galaxy or neon. Glass, crystal, frosted glass, ice and jade are see-through: the tinted inside and what is in it show. Lava and neon glow in the color of the light, the galaxy shows stars and clouds in the die color and the second color.
* **Inside:** a glowing orb, a flame, a swirl, fireflies, an eye that looks around and blinks, a star, a beating heart, a dragon eye, the moon, the sun, a snowflake, a skull, a lightning bolt, a ghost, a leaf, a music note, a cog, yin and yang, a shield, a mask, a feather, a paw, an ankh, a spellbook, a fist, a flask, a brain, a battle axe, a sword, a bow, a wizard hat, a raven, a spider or a dove, in the color of the light or a color of its own. It shows only through the see-through materials, so picking it turns other materials into glass.
* **Numbers:** fitting the material (black or white, whichever reads better, painted white on see-through materials, carbon and the galaxy, ink on parchment, glowing on lava and neon), or a color of your own.
* **Font:** classic, serif, carved, future, typewriter or roman.

**Throw**

* **Way of throwing:** how your dice reach the table. Thrown from the side (the default), from a hand that shakes the dice and throws them, tipped from a cup, dropped from above, shot from a cannon one after the other, slammed on the table so it shakes, out of a whirl, through a portal in the color of the light, teleported to their places in a flash, as burning meteors that leave craters, shot from a bow one after the other, carried in on a gust of wind, or sinking down beams of light. Every way takes the same time, and the dice land on the same places on every screen.
* **On a triumph:** what happens when one of your dice is a triumph (see *Big moments*): a golden burst (the default), fireworks, a rain of confetti, a ray of light from above, a crown, golden edges of the screen, applause with roses and notes, a ring of flowers, a hammer of light that strikes the die, a roar that shakes the table, or nothing.
* **On a fumble:** a red burst (the default), cracks in the table, a skull, a rain cloud, black smoke, red edges of the screen, wilting leaves, a spell that fizzles, or nothing.

**Effects**

* **Glow:** none, soft, strong, flickering like a candle or in all colors of the rainbow, in a color of the light. A glowing die has shining numbers and lights up the table below it while it flies.
* **Trail:** none, sparks, embers, stars, smoke, hearts, bubbles, petals, snow, confetti, leaves, coins, music notes, glitter, ghosts, feathers, drops of blood, runes, bats, gusts of wind or cogs behind the die while it flies.
* **Aura:** around the die while it flies and while it lies on the table. Pulse and heartbeat let the light inside the die and its light on the table beat. Ripples spread over the table, rays of light turn behind the die, motes circle it (in front of it and behind it), flames lick up, lightning flashes, frost mist drifts, dark shadows rise, a halo floats above it, a planet ring turns around it, stars twinkle, sparks rise, bubbles and hearts float up, snow falls, a circle of runes or a dark vortex turns under it, butterflies circle it. Rage throbs red under the die while red heat rises, vines turn under it with leaves drifting around, arcs of ki circle it, gears turn on the table behind it, tentacles rise around its foot and sway, the hunter's mark turns under it, wings beat on both its sides, notes circle it, a shield of light surrounds it. All in the color of the light, or a color of their own.
* **Landing:** when the die lands: a puff of dust, a shockwave, sparkles, a splash, a circle of runes, a crater, flowers, confetti, a lightning strike, frost, fire, a puff of smoke, coins, hearts, an ink splash, a holy circle of light, crossed blades with sparks above the die, arrows striking around it, a quake that cracks and shakes the table, bones, steam, or a chord of notes.

Most ready looks come with effects, and many with a way of throwing and big moments.

When the GM sets *Dice colors* to *Always the player color*, colors stay the player color. Pattern, material, what is inside, font and effects remain each user's choice.

## Light and particles

* **Glow, trails, auras, landings and the way of throwing** come from each user's choice in *My dice*. Without effects on a screen (or at the table) the dice are thrown from the side there, to the same places.
* **Big moments:** when a triumph or a fumble lands (see *Big moments* above), its thrower's moment plays (*On a triumph*, *On a fumble*): by default a ring of light and particles bursts from it, gold and rising on a triumph, red and sinking on a fumble.
* **Who sees them:** the GM picks for the table in *Light and particles*: everything (default), only the moments of triumphs and fumbles, or none. Each device can turn them off for itself with *Light and particles on this device*, the others still see them.
* They play like the dice themselves, in the browser's compositor, and leave nothing behind. With reduced motion there are none.
* Every die carries its effects. From five dice on each die gets fewer particles, so weak computers keep their frames. Up to four dice the light moves over the faces while they tumble, larger throws keep the light of the resting dice.
* What is inside glass and crystal moves (breathes, flickers, turns, looks around) only while effects are on. With effects off it holds still.

## Sounds of the dice

With *Sounds of the dice* on, a device plays a click each time a die hits the table, softer with every hop: plastic, wood, stone, ringing metal or chiming glass, by material. Hand and cup rattle, the cannon booms, a slam thuds, portals, whirls and teleports whoosh, meteors howl. The sounds are made in the browser, there are no sound files, and they follow Foundry's interface volume. Foundry's own dice sound still plays when the roll appears.

## Slow screens

Each screen measures its frame rate over the last seconds. Below *Skip dice on slow screens* (20 frames per second by default) that screen throws no dice and shows results at once, the other screens are not affected. 0 always shows the dice. Without a scene on the canvas nothing is measured and dice always show.

## Settings

GM settings, for the whole world:

| Setting | What it does |
| --- | --- |
| Results in the chat | When the dice have landed (default) or at once |
| Speed of a throw | Fast (1 second), normal (1.4 seconds) or slow (1.9 seconds), the same for everyone |
| One throw after the other | A roll that comes while dice still roll waits until they lie still, its card comes into the chat with its dice, at most 4 seconds (on) |
| Dice colors | Player color with own colors allowed (default), or always the player color |
| Throw initiative rolls | Also throw dice for initiative from the combat tracker (on) |
| Throw rolls of characters no player owns | Also throw dice for monsters and other characters of the GM (on) |
| Hidden rolls | Covered dice for the one who rolled (default), for everyone who sees the card, or no dice |
| Big moments | As the game system counts them (default), my own rule, or none. Under the field the rule of the game system |
| Own rule: die | The die that decides for the own rule, starts with the game system's (d20 in most systems) |
| Own rule: triumph on | Results of that die that are a triumph (`20`, `19-20`, `1, 2`, `max`), starts with the game system's |
| Own rule: fumble on | Results of that die that are a fumble, starts with the game system's |
| Light and particles | Everything: glow, trails, auras, landings and moments (default), only the moments of triumphs and fumbles, or none |
| Dice per throw | How many dice a throw shows, 10 by default |
| Skip dice on slow screens | Frames per second below which a screen skips the dice, 20 by default, 0 never skips |

Settings of each device:

| Setting | What it does |
| --- | --- |
| Module language | Follow Foundry, Deutsch or English |
| Show dice on this device | Off shows only the chat cards, their results at once |
| Where the dice fall | Beside the chat or in the middle of the screen |
| Size of the dice | Size of one die in pixels |
| Dice stay for | Seconds the dice stay after they landed |
| Light and particles on this device | Off shows no glow, trails, auras, landings, ways of throwing or big moments on this device (on) |
| Sounds of the dice | The dice click on the table in the sound of their material, some ways of throwing have their own sounds, at Foundry's interface volume (off) |
| Button in the token controls | The dice button for *My dice* in the token controls on the left, hidden while Dice So Nice is active (on) |

## Keys

*Open My dice* and *Throw test dice* have no keys by default. Set them in Foundry's *Configure Controls*.

## With Dice So Nice

Swift Dice stays off while Dice So Nice is active, so nobody sees two sets of dice, and the GM gets a one time notice. Turn off one of the two modules. Modules that wait for Dice So Nice before they go on do not wait for Swift Dice, they simply go on.

## Self test

*Run self test* in the module settings checks what Swift Dice needs: that Dice So Nice is off, that the browser draws 3D shapes with CSS, cuts out faces and plays Web Animations, Foundry's dice classes and chat message visibility, all dice shapes, a real test roll turned into dice, a test die built in the page, and the settings and texts. The result comes as a notification and a chat message only you see, with the Foundry version the module was verified with. After a Foundry update you get a one time notice to run it.

## Debug file

For bug reports, the GM saves one file about all of Sephral’s modules in this world: `Save debug file` in the module settings, or `Save Debug File (Sephral’s Modules)` in the context menu of a chat message. It holds the versions of Foundry, the system and the active modules, the settings of the modules and what they recorded, for Swift Dice the settings of the GM's device, the frame rate, the look of every user's dice, the dice on the table, and for recent roll messages which dice were thrown or why not. Macros call `game.modules.get("sephrals-swift-dice").api.saveDebugFile()`.

The file contains chat text and whispers. Check it before you share it.

## Sephral’s Modules

The first button in the module settings, *Sephral’s Modules* (GMs only), opens one window for all of Sephral's modules in the world: the version, self test, settings, manual and demo video of each, a button that switches on an installed module that is off (Foundry then reloads the world for everyone), and the debug file. Below, *More from Sephral* lists other modules that fit the game system of the world, shown only after a click, each with its demo video and an *Install* button. Foundry installs modules only on its setup screen, so the button copies the module's link (manifest URL) and shows the steps with a short clip. When the GM launches the world again, the window opens once with the new module and its *Enable* button. The list is part of the module. Only a video you start is loaded, from the module page on GitHub.

## Storage

The look of each user's dice is saved with that user in the world. Nothing else is stored: the dice exist only on the screen while they roll.

## Limits

* The dice are drawn shapes, not a physics simulation: they cannot be grabbed, thrown with the mouse or collide with each other.
* Rolls that never reach the chat (some systems show dice for rolls they do not post) throw no dice.
* Every screen starts the throw when the message arrives there. On very different connections the dice land a little apart.
* Firefox shows what is inside glass and crystal weaker than Chrome and the Foundry app.
* The rules of games not in the table of *Big moments* are not known: they use a natural 20, or the GM's own rule. Rules that depend on the target number of a roll (a raise in Savage Worlds, the degrees of PF2e) need the system's own roll, a roll typed into the chat has no target.

## Macro API

`game.modules.get("sephrals-swift-dice").api` offers:

| Function | What it does |
| --- | --- |
| `open()` | Opens *My dice* |
| `testThrow(formula)` | Throws dice on this screen only, without a chat message, for example `testThrow("2d6 + 1d20")` |
| `waitForReveal(messageId)` | Resolves when the result of a card shows: at once when it does not wait for dice, after a few seconds at the latest. Returns whether it waited |
| `isActive()` | Whether this screen throws dice (off with Dice So Nice or on this device) |
| `clearTable()` | Takes all dice off this screen |
| `frameRate()` | The frame rate of this screen over the last seconds, or null while unknown |
| `rollsOf(message)` | The rolls Swift Dice reads from a chat message, Ready Set Roll cards included |
| `readyLook(key)` | The look of a ready look, a class or a creature (`"nebula"`, `"druid"`, `"undead"`), to store with `game.user.setFlag("sephrals-swift-dice", "look", ...)` |
| `runSelfTest()` | Runs the self test (GM) |
| `saveDebugFile()` | Saves the debug file (GM) |

When the result of a waiting card shows, the hook `sephrals-swift-dice.revealed` is called with the message.

## Usage statistics

The module can take part in a small usage report shared by all of Sephral’s modules. Nothing is counted or sent until the GM agrees: shortly after the world starts, the active GM is asked, and the question comes back at every start until there is an answer. The answer counts for all of Sephral’s modules in the world. *Share usage statistics* in the module settings turns the report on or off at any time, and *Manage statistics* below it shows what the report contains right now.

With the GM’s consent only the active GM’s browser counts, and it sends at most one report a day. The counts are kept in a hidden world setting, so all browsers and computers of the GM count together, and turning the statistics off deletes them. A copy of a world gets its own world ID. The question lists everything the report contains, from the Foundry version to a random world ID. For Swift Dice it holds:

* on how many of the last 30 days the module was used
* how often the GM's screen threw dice, covered dice, dice added to a card later and dice that waited for the throw before them, how often *My dice* was opened, an own color was chosen, *Surprise me* was used, a class look was chosen, dice were set to follow the class, a look was reset and test dice were thrown
* the settings *Results in the chat*, *Speed of a throw*, *One throw after the other*, *Dice colors*, *Throw initiative rolls*, *Throw rolls of characters no player owns*, *Hidden rolls*, *Big moments*, *Light and particles*, *Dice per throw*, *Skip dice on slow screens*, and the GM's *Where the dice fall*, *Size of the dice* and *Light and particles on this device* (only the chosen option)
* where errors occur in the module code: file, line, error type and whether the error arose in the module itself, in Foundry, in the game system or in another module, never the error message or the name of another module

No names, notes, pictures or other content of the world are sent.
