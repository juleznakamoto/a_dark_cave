# Steam achievement icons: pick a subject

Unlocked icons only. Style lock is below (do not change it without asking the user). This file is also the subject list. **Do not generate images until every row has one pick.** Keep only locked image files under `steam/achievement-icon-concepts/`.

**How to pick:** mark one box `- [x]`, or write your own in `Other`. Reply in chat or edit this file.

Steam create order (76, no web-only Supporter). Two achievements share the name **Hunter**; the ids tell them apart.

---

## Style lock (do not change without asking)

Albrecht Dürer nature study: sepia ink, fine hatching, observational. Not a woodcut or linocut.

**Square:** fills edge to edge, no transparent outside. Default: the study parchment IS the square. Exception: Explore Cave is a worn folded **sheet of paper** as a still-life object on that parchment (map drawn on the sheet, not full-bleed on the background).

**Color:** lock from `steam/achievement-icon-concepts/basic-0-woodGatherer.png`. Cream-tan parchment ~`#DDC495` / RGB 221,196,149. Ink ~`#8D6A3A`. Always Reinhard-match every new gen to `basic-0-woodGatherer.png` (tool outputs RGB, no alpha).

**No text, no letters, no compass "N".**

**Pipeline:** GenerateImage 1:1, 1024×1024. Files land in Cursor assets, then Reinhard, then `steam/achievement-icon-concepts/review/<id>/vNN.png`.

**Lock:** keep only what the user says to use. Copy that file to `steam/achievement-icon-concepts/<canonicalId>.png` (same id as the pick table, e.g. `basic-0-woodGatherer.png`), delete that achievement’s review folders only, update the pick table below and the ARCHITECTURE locked list.

**Reinhard** (run on every new gen; tool output is RGB, no alpha):

```python
from PIL import Image
import numpy as np
wood = np.array(Image.open(r'.../steam/achievement-icon-concepts/basic-0-woodGatherer.png').convert('RGB'))
def reinhard(src, tgt):
    s = src.astype(np.float32); t = tgt.astype(np.float32)
    out = (s - s.mean((0,1))) * (t.std((0,1)) / np.maximum(s.std((0,1)), 1e-6)) + t.mean((0,1))
    return np.clip(out, 0, 255).astype(np.uint8)
```

**Contrast (craft-tools lesson):** Reinhard can leave true-black ink even when RGB std matches wood. After Reinhard, if P1 luminance is much darker than wood (~41), apply a warm dark-tail lift so ink sits with wood. Do not restretch with a second Reinhard. Do not invent new drawings.

Warm lift used on craft-tools (additive on darks only, keep wood’s warm ink):

```python
def lum(rgb):
    rgb = rgb.astype(np.float32)
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

def match_dark_luma_warm(arr, wood_arr, dark_cut=85.0, strength=1.0):
    x = arr.astype(np.float32)
    Ls = lum(x)
    Lt = lum(wood_arr.astype(np.float32))
    src_p = np.percentile(Ls[Ls < dark_cut], np.linspace(0, 100, 48))
    tgt_p = np.percentile(Lt[Lt < dark_cut], np.linspace(0, 100, 48))
    Lnew = np.interp(Ls, src_p, tgt_p)
    blend = np.clip((dark_cut - Ls) / 18.0, 0, 1) * strength
    delta = np.maximum(Lnew - Ls, 0.0) * blend
    warm = np.array([1.28, 1.00, 0.62], dtype=np.float32)
    warm = warm / np.float32(0.2126 * warm[0] + 0.7152 * warm[1] + 0.0722 * warm[2])
    return np.clip(x + delta[..., None] * warm, 0, 255).astype(np.uint8)
```

Default lift after Reinhard: `match_dark_luma_warm(reinhard(src, wood), wood, dark_cut=85, strength=1.0)` only when P1 is much below wood. Skip the lift if P1 is already near ~41.

### Locked finals (basic set)

Color/contrast authority: `basic-0-woodGatherer.png`. Dest filenames match Steam canonical ids (`{category}-{segmentId}`):

- basic-0-woodGatherer.png
- basic-0-stoneMiner.png, basic-0-coalMiner.png, basic-0-ironMiner.png, basic-0-steelForger.png
- basic-1-explorer.png (paper sheet + tunnel drawing; paper-locked-tunnels v05)
- basic-0-hunter.png, basic-0-tanner.png, basic-1-torchCrafter.png, basic-1-toolCrafter.png
- basic-1-builder.png, basic-1-communityBuilder.png

---

## Basic

### Gather Wood

`basic-0-woodGatherer` — Gather 500 wood in total.

- [x] 1. Short stack of three cut logs (locked art: basic-0-woodGatherer.png)
- [ ] 2. Stone axe leaning on a log pile
- [ ] 3. Tied bundle of firewood standing upright
- [ ] 4. Tree stump with an axe buried in the top
- [ ] 5. Single log split once, wedge in the crack
- [ ] Other:



### Gather Stone

`basic-0-stoneMiner` — Gather 500 stone in total.

- [ ] 1. Rough stone chunk, one clean break face
- [ ] 2. Small cairn of three stacked stones
- [ ] 3. Pickaxe head resting on a rock
- [ ] 4. Broken boulder in two halves
- [ ] 5. Flat slab with a hammer mark
- [x] Other: Three irregular field stones in a tight triangle (locked art: basic-0-stoneMiner.png, v17)



### Gather Iron

`basic-0-ironMiner` — Gather 500 iron in total.

- [ ] 1. Iron ore nugget with a few rust pits
- [x] 2. Three raw ore lumps in a cluster (locked art: basic-0-ironMiner.png, like-v01 v08)
- [ ] 3. Pickaxe and one ore chunk
- [ ] 4. Simple horseshoe of raw iron
- [ ] 5. Ore vein as a short dark streak in rock
- [ ] Other:



### Gather Coal

`basic-0-coalMiner` — Gather 500 coal in total.

- [ ] 1. Faceted black coal lump
- [ ] 2. Small heap of coal pieces
- [ ] 3. Coal lump with a faint ember spark
- [ ] 4. Scuttle or scoop holding coal
- [ ] 5. Coal seam as a black band in pale rock
- [x] Other: Three raw coal lumps in a cluster (locked art: basic-0-coalMiner.png, like-v09 v09)



### Forge Steel

`basic-0-steelForger` — Forge 250 steel in total.

- [ ] 1. Steel ingot, clean rectangular bar
- [ ] 2. Ingot on a small anvil
- [ ] 3. Hammer and tongs crossed
- [ ] 4. Glowing bar just off the forge
- [x] 5. Three stacked ingots (locked art: basic-0-steelForger.png, like-v07 v07)
- [ ] Other:



### Hunter (food)

`basic-0-hunter` — Gather 500 food in total.

- [ ] 1. Hanging game haunch
- [ ] 2. Sitting hare in profile
- [ ] 3. Simple game bag tied shut
- [ ] 4. Roast on a short spit
- [ ] 5. Pair of rabbit ears and a small hide
- [x] Other: Piece of meat hanging from a rack (locked art: basic-0-hunter.png, hunter-like-v03 v07)



### Tanner

`basic-0-tanner` — Gather 250 leather in total.

- [x] 1. Stretched hide on a simple frame (locked art: basic-0-tanner.png, tanner-like-v03-v03-v10 v01)
- [ ] 2. Rolled leather hide tied with cord
- [ ] 3. Scraping knife and a flat hide
- [ ] 4. Folded stack of leather sheets
- [ ] 5. Hide hanging from a peg
- [ ] Other:



### Explore Cave

`basic-1-explorer` — Explore the cave 20 times.

- [ ] 1. Upright torch, cloth head and small flame
- [ ] 2. Dark cave mouth with a torch just inside
- [ ] 3. Footprints entering an arch
- [ ] 4. Coil of rope and a torch
- [ ] 5. Nested tunnel arches, tiny flame far back
- [x] Other: Footprints towards a cave entry
- [x] New: Map on old paper with a simple stylized cave system (locked art: basic-1-explorer.png, explore-cave-paper-locked-tunnels v05)



### Craft Torches

`basic-1-torchCrafter` — Craft 50 torches in total.

- [ ] 1. Bundle of three unlit torches
- [ ] 2. One lit torch and a spare unlit shaft
- [ ] 3. Wrapping cloth around a stick (no hands)
- [ ] 4. Torch head close-up, bound pitch
- [ ] 5. Rack of torches in a wall bracket
- [x] Other: bundle of 3 torches (locked art: basic-1-torchCrafter.png, craft-torches-v7-wool-like-v06 v01)



### Craft Tools

`basic-1-toolCrafter` — Own 5 different tools.

- [ ] 1. Axe, pick, and hammer in a fan
- [ ] 2. Tool rack with five simple silhouettes
- [ ] 3. Crossed hammer and tongs
- [ ] 4. Workbench edge with three tool heads
- [ ] 5. Single anvil with tools leaning on it
- [x] Other: One stone hammer (wooden handle) (locked art: basic-1-toolCrafter.png, craft-tools-stone-hammer-like-v04 v03)



### Construct Buildings

`basic-1-builder` — Own at least 5 buildings.

- [ ] 1. Simple wooden hut gable
- [ ] 2. Hammer and set-square crossed
- [ ] 3. Five small rooftops in a row
- [ ] 4. Corner post and a beam joint
- [ ] 5. Plumb bob hanging straight
- [x] Other: basic iron hammer + 3 iron nails (no plank) (locked art: basic-1-builder.png, construct-iron-hammer-nails v01)



### Build Community

`basic-1-communityBuilder` — Reach a population of 10.

- [ ] 1. Cluster of three small huts
- [ ] 2. Two simple figures by a fire
- [ ] 3. Shared table with a loaf and bowl
- [ ] 4. Circle of ten tally marks on wood
- [ ] 5. Village well
- [x] Other: a communal cooking pot (locked art: basic-1-communityBuilder.png, build-community-pot-like-v04-v10 v10)

---



## Building



### Basic Shelter

`building-0-0` — Build 10 Wooden Huts.

- [ ] 1. Wooden hut, plank walls, thatch roof
- [ ] 2. Hut door with a wooden latch
- [ ] 3. Ten tiny hut rooftops as a grid
- [ ] 4. Split logs stacked as a wall
- [ ] 5. Hut under construction, two posts and a beam
- [ ] Other:



### Sturdy Shelter

`building-0-1` — Build 10 Stone Huts.

- [ ] 1. Stone hut with a heavy lintel
- [ ] 2. Arched stone doorway
- [ ] 3. Mason’s mallet and chisel
- [ ] 4. Dry-stone wall corner
- [ ] 5. Small stone chimney
- [ ] Other:



### Nordic Shelter

`building-0-2` — Build 5 Longhouses.

- [ ] 1. Long low hall with a ridge roof
- [ ] 2. Dragon-head gable, very simple
- [ ] 3. Longhouse from the end, oval door
- [ ] 4. Pair of carved doorposts
- [ ] 5. Long roof with smoke from the center
- [ ] Other:



### Nomadic Shelter

`building-0-3` — Build 5 Fur Tents.

- [ ] 1. Fur tent, cone of hides
- [ ] 2. Tent poles tied at the peak
- [ ] 3. Tent flap half open
- [ ] 4. Bundle of tent poles and hides
- [ ] 5. Tent with a small smoke hole
- [ ] Other:



### Huntsmen

`building-1-0` — Build Hunter Cabin and all upgrades.

- [ ] 1. Cabin with antlers over the door
- [ ] 2. Bow hanging beside a cabin door
- [ ] 3. Cabin and a drying rack of hides
- [ ] 4. Hunting horn on a cabin wall
- [ ] 5. Simple log cabin with a chimney
- [ ] Other:



### Forgers

`building-1-1` — Build Blacksmith and all upgrades.

- [ ] 1. Anvil, horn and hardy hole
- [ ] 2. Smith’s hammer on the anvil
- [ ] 3. Forge with bellows
- [ ] 4. Tongs holding a hot bar
- [ ] 5. Horseshoe nailed above a shop door
- [ ] Other:



### Smelters

`building-1-2` — Build Foundry and all upgrades.

- [ ] 1. Crucible pouring a short stream
- [ ] 2. Foundry furnace with a tap hole
- [ ] 3. Mold with a cooling ingot
- [ ] 4. Ladle over a mold
- [ ] 5. Stack of molds
- [ ] Other:



### Hideworkers

`building-1-3` — Build Tannery and all upgrades.

- [ ] 1. Tannery vat with a hide over the rim
- [ ] 2. Hide on a stretching frame
- [ ] 3. Rows of hanging hides
- [ ] 4. Bark vat and a stirring paddle
- [ ] 5. Finished leather roll by a vat
- [ ] Other:



### Miners

`building-2-0` — Build Shallow Pit and all upgrades.

- [ ] 1. Mine pit with a timber frame
- [ ] 2. Winch and bucket over a shaft
- [ ] 3. Pickaxe and a lantern at a pit mouth
- [ ] 4. Cart of ore at the pit edge
- [ ] 5. Timbered tunnel mouth
- [ ] Other:



### Traders

`building-3-0` — Build Trade Post and all upgrades.

- [ ] 1. Trade-post stall with a hanging scale
- [ ] 2. Merchant’s scale, empty pans
- [ ] 3. Coin pouch on a counter
- [ ] 4. Signboard with a simple coin mark
- [ ] 5. Two sacks and a crate
- [ ] Other:



### Provisioners

`building-3-1` — Build Supply Hut and all upgrades.

- [ ] 1. Barrel and a grain sack
- [ ] 2. Supply hut with a barred window
- [ ] 3. Stacked crates
- [ ] 4. Hanging ham and a sack
- [ ] 5. Open crate of mixed stores
- [ ] Other:



### Scholars

`building-3-2` — Build Clerk's Hut and all upgrades.

- [ ] 1. Open ledger and a quill
- [ ] 2. Inkwell and a rolled scroll
- [ ] 3. Clerk’s hut with a shuttered window
- [ ] 4. Stack of bound books
- [ ] 5. Wax seal and a letter
- [ ] Other:



### Priests

`building-3-3` — Build Altar and all upgrades.

- [ ] 1. Simple stone altar with a flame
- [ ] 2. Altar and a hanging censer
- [ ] 3. Stone bowl of offering
- [ ] 4. Altar cloth and a candle
- [ ] 5. Standing stone with a carved mark
- [ ] Other:



### Keep Walls

`building-4-0` — Build Palisades and all upgrades.

- [ ] 1. Row of pointed palisade stakes
- [ ] 2. Gate in a wooden palisade
- [ ] 3. Corner of a palisade with a brace
- [ ] 4. Single sharpened stake, close
- [ ] 5. Palisade seen from inside, walkway
- [ ] Other:



### Lookout

`building-4-1` — Build Watchtower and all upgrades.

- [ ] 1. Wooden watchtower, ladder and platform
- [ ] 2. Tower top with a horn
- [ ] 3. Beacon fire on a tower
- [ ] 4. Tower silhouette, very few lines
- [ ] 5. Spyglass on a railing
- [ ] Other:

---



## Item



### Axes

`item-0-axes` — Craft every axe from stone to adamant.

- [ ] 1. Single fine axe, head in profile
- [ ] 2. Three axe heads stacked by size
- [ ] 3. Crossed pair of axes
- [ ] 4. Axe head from stone to metal, same shape
- [ ] 5. Axe planted in a wheel of wood
- [ ] Other:



### Pickaxes

`item-0-pickaxes` — Craft every pickaxe from stone to adamant.

- [ ] 1. Pickaxe standing, two-point head
- [ ] 2. Three pick heads in a row
- [ ] 3. Crossed pickaxes
- [ ] 4. Pick biting into a rock
- [ ] 5. Pick head only, large
- [ ] Other:



### Lanterns

`item-0-lanterns` — Craft every lantern from iron to adamant.

- [ ] 1. Hanging lantern, flame inside
- [ ] 2. Three lanterns of rising craft
- [ ] 3. Lantern on a hook
- [ ] 4. Open lantern door, candle inside
- [ ] 5. Lantern seen from above, hexagonal
- [ ] Other:



### Swords

`item-1-swords` — Craft every sword from iron to adamant.

- [ ] 1. Upright sword, simple crossguard
- [ ] 2. Three swords in a fan
- [ ] 3. Crossed swords
- [ ] 4. Sword on a stand
- [ ] 5. Hilt and guard close-up
- [ ] Other:



### Bows

`item-1-bows` — Craft every bow from crude to master.

- [ ] 1. Unstrung bow standing
- [ ] 2. Strung bow with one arrow
- [ ] 3. Three bows nested by curve
- [ ] 4. Bow and quiver together
- [ ] 5. Recurve bow only, taut string
- [ ] Other:



### Leatherworks

`item-2-explorer_pack` — Craft all seven leatherworks.

- [ ] 1. Explorer’s pack, bedroll on top
- [ ] 2. Pack, waterskin, and belt pouch
- [ ] 3. Closed satchel with a buckle
- [ ] 4. Seven small leather pieces in a ring
- [ ] 5. Boots and a pack
- [ ] Other:



### Schematics

`item-2-schematic_weapons` — Craft three schematic weapons.

- [ ] 1. Unrolled blueprint with a weapon outline
- [ ] 2. Three sealed schematic tubes
- [ ] 3. Compass and a plan sheet
- [ ] 4. Halberd silhouette on paper
- [ ] 5. Wax-sealed scroll
- [ ] Other:



### Ancient Wisdom

`item-3-ancient_books` — Collect all three ancient books.

- [ ] 1. Three closed books in a stack
- [ ] 2. Open book with a simple mark
- [ ] 3. Book with a clasp and a ribbon
- [ ] 4. Three books fanned
- [ ] 5. Book on a lectern
- [ ] Other:



### Good Company

`item-3-fellowship` — Recruit all six fellowship companions.

- [ ] 1. Six simple tokens or stones in a ring
- [ ] 2. Six cloaked silhouettes, tiny
- [ ] 3. Shared camp table, six cups
- [ ] 4. Knot of six cords
- [ ] 5. Six marks on a shield
- [ ] Other:



### Dark Tools

`item-4-blacksteel_tools` — Craft all three blacksteel tools.

- [ ] 1. Black axe, pick, and lantern grouped
- [ ] 2. Single black pickaxe, dark metal
- [ ] 3. Black tool heads on a rack
- [ ] 4. Blacksteel ingot and a tool
- [ ] 5. Dark lantern only
- [ ] Other:



### Dark War Equipment

`item-4-blacksteel_equipment` — Craft all three blacksteel war items.

- [ ] 1. Black sword, bow, and helm or armor plate
- [ ] 2. Black sword upright
- [ ] 3. Black bow and a dark arrow
- [ ] 4. Breastplate with a dark sheen
- [ ] 5. Crossed black sword and bow
- [ ] Other:

---



## Action



### Cave Explorer

`action-0-exploreCave` — Upgrade Explore Cave to level 10.

- [ ] 1. Lantern held into a crack (no hand)
- [ ] 2. Map fragment and a compass
- [ ] 3. Climbing spike and rope
- [ ] 4. Deep shaft looking down, small light
- [ ] 5. Cave pillar and a marked wall
- [ ] Other:



### Wood Chopper

`action-0-chopWood` — Upgrade Chop Wood to level 10.

- [ ] 1. Axe mid-swing over a chopping block
- [ ] 2. Chopping block with embedded axe
- [ ] 3. Flying chips around a split log
- [ ] 4. Two-handed axe only
- [ ] 5. Woodpile neatly stacked
- [ ] Other:



### Hunter (hunt)

`action-0-hunt` — Upgrade Hunt to level 10.

- [ ] 1. Bow drawn, arrow nocked (no archer)
- [ ] 2. Snare loop on the ground
- [ ] 3. Animal tracks in a patch of dirt
- [ ] 4. Quiver with three arrows
- [ ] 5. Hunting horn
- [ ] Other:



### Torch Crafter

`action-0-craftTorches` — Upgrade Craft Torches to level 10.

- [ ] 1. Pitch pot and a stick
- [ ] 2. Hands-free: wrapping a torch head
- [ ] 3. Row of finished torches
- [ ] 4. Dipping a torch in pitch
- [ ] 5. Lit torch and a pitch ladle
- [ ] Other:



### Stone Miner

`action-1-mineStone` — Upgrade Mine Stone to level 10.

- [ ] 1. Pick striking a stone face
- [ ] 2. Hammer and chisel on stone
- [ ] 3. Wheelbarrow of stone
- [ ] 4. Stone chips flying from a blow
- [ ] 5. Miner’s pick only, worn
- [ ] Other:



### Iron Miner

`action-1-mineIron` — Upgrade Mine Iron to level 10.

- [ ] 1. Pick in an iron-stained vein
- [ ] 2. Iron ore in a miner’s pan
- [ ] 3. Cart of iron ore
- [ ] 4. Rust-red rock with a pick mark
- [ ] 5. Iron nugget split by a pick
- [ ] Other:



### Coal Miner

`action-1-mineCoal` — Upgrade Mine Coal to level 10.

- [ ] 1. Pick in a black coal face
- [ ] 2. Coal cart
- [ ] 3. Miner’s lamp and a coal lump
- [ ] 4. Black dust cloud from a strike
- [ ] 5. Coal basket
- [ ] Other:



### Sulfur Miner

`action-1-mineSulfur` — Upgrade Mine Sulfur to level 10.

- [ ] 1. Yellow sulfur crystal
- [ ] 2. Pick and a yellow chunk
- [ ] 3. Cluster of sulfur crystals
- [ ] 4. Cloth bag of yellow powder
- [ ] 5. Pale rock with yellow veins
- [ ] Other:



### Obsidian Miner

`action-1-mineObsidian` — Upgrade Mine Obsidian to level 10.

- [ ] 1. Sharp black obsidian shard
- [ ] 2. Knapped blade of glass-stone
- [ ] 3. Pick and a glassy black chunk
- [ ] 4. Broken obsidian with a conchoidal face
- [ ] 5. Dark flow-stone slab
- [ ] Other:



### Adamant Miner

`action-1-mineAdamant` — Upgrade Mine Adamant to level 10.

- [ ] 1. Hard geometric adamant crystal
- [ ] 2. Pick bouncing off a crystal (cracked pick)
- [ ] 3. Faceted gem-like ore
- [ ] 4. Crystal in a rock socket
- [ ] 5. Three adamant shards
- [ ] Other:



### Moonstone Miner

`action-1-mineMoonstone` — Upgrade Mine Moonstone to level 10.

- [ ] 1. Pale stone with a crescent mark
- [ ] 2. Moonstone glowing faintly in a palm-sized chunk
- [ ] 3. Pick and a white-blue stone
- [ ] 4. Crescent moon over a stone
- [ ] 5. Smooth oval moonstone
- [ ] Other:



### Bone Sacrificer

`action-2-boneTotems` — Sacrifice bone totems 20 times.

- [ ] 1. Bone totem burning on an altar
- [ ] 2. Skull and crossed bones, simple
- [ ] 3. Bone pole with hanging charms
- [ ] 4. Ash pile and a remaining bone
- [ ] 5. Offering bowl of bones
- [ ] Other:



### Leather Sacrificer

`action-2-leatherTotems` — Sacrifice leather totems 20 times.

- [ ] 1. Leather totem on fire
- [ ] 2. Hide effigy on a stake
- [ ] 3. Burned leather scrap and smoke
- [ ] 4. Leather mask on an altar
- [ ] 5. Tied hide bundle on coals
- [ ] Other:



### Animal Sacrificer

`action-2-animals` — Sacrifice animals 10 times.

- [ ] 1. Small animal on an altar (no gore)
- [ ] 2. Knife and a ritual bowl
- [ ] 3. Bound offering, simple silhouette
- [ ] 4. Altar stain and a dropped knife
- [ ] 5. Horned skull on a stone
- [ ] Other:



### Bone Totem Crafter

`action-2-craftBoneTotems` — Upgrade Craft Bone Totems to level 10.

- [ ] 1. Unfinished bone totem on a bench
- [ ] 2. Bone and cord being bound
- [ ] 3. Finished bone totem standing
- [ ] 4. Carving knife and a bone
- [ ] 5. Two totems, one half-done
- [ ] Other:



### Leather Totem Crafter

`action-2-craftLeatherTotems` — Upgrade Craft Leather Totems to level 10.

- [ ] 1. Leather totem on a stand
- [ ] 2. Needle, thong, and a hide cutout
- [ ] 3. Stuffed hide figure
- [ ] 4. Pattern piece and shears
- [ ] 5. Finished totem and a leftover scrap
- [ ] Other:



### Ember Bomb Crafter

`action-3-emberBombs` — Craft 20 Ember Bombs.

- [ ] 1. Round bomb with a short fuse
- [ ] 2. Clay pot of embers, bound
- [ ] 3. Two bombs and a fuse coil
- [ ] 4. Bomb mid-spark
- [ ] 5. Ember glowing in a cracked pot
- [ ] Other:



### Ashfire Bomb Crafter

`action-3-ashfireBombs` — Craft 20 Ashfire Bombs.

- [ ] 1. Darker bomb with ash marks
- [ ] 2. Bomb trailing a curl of ash
- [ ] 3. Pair of bombs, one cracked, ash out
- [ ] 4. Ash heap around a fuse
- [ ] 5. Bomb stamped with a flame mark
- [ ] Other:



### Veinfire Elixir Maker

`action-3-veinfireElixir` — Craft 10 Veinfire Elixirs.

- [ ] 1. Small vial of dark-red liquid
- [ ] 2. Alembic dripping into a vial
- [ ] 3. Stoppered flask with a vein-like swirl
- [ ] 4. Mortar and a glowing drop
- [ ] 5. Three vials in a rack
- [ ] Other:



### Burning Veins

`action-3-burningVeins` — Use 10 Veinfire Elixirs.

- [ ] 1. Empty vial, last drop falling
- [ ] 2. Forearm veins as simple branching lines (no person)
- [ ] 3. Broken vial and a red puddle
- [ ] 4. Heart-like knot of burning veins
- [ ] 5. Handprint of ember-lines (no hand flesh, just the print)
- [ ] Other:



### Deal Maker

`action-4-merchantPurchases` — Make 100 merchant purchases.

- [ ] 1. Coin changing hands, shown as two coins meeting
- [ ] 2. Merchant’s cart wheel and a crate
- [ ] 3. Price tally stick with notches
- [ ] 4. Open coin purse
- [ ] 5. Handshake of two simple wrists
- [ ] Other:



### Experienced Gambler

`action-0-gamblerWins` — Win 10 times against the gambler.

- [ ] 1. Pair of dice showing a winning throw
- [ ] 2. Three dice in a cup
- [ ] 3. Coin on its edge
- [ ] 4. Cards or sticks in a winning fan
- [ ] 5. Dice and a small gold pile
- [ ] Other:



### Fire Feeder

`action-4-feedFire` — Feed the fire 100 times.

- [ ] 1. Three-log campfire
- [ ] 2. Stick being pushed into the flame
- [ ] 3. Stone-ring hearth
- [ ] 4. Brazier bowl of embers
- [ ] 5. Flame only, heraldic
- [ ] Other:



### Mental Clarity

`action-4-mentalClarity` — Use 5 Clarity Elixirs.

- [ ] 1. Clear glass vial
- [ ] 2. Open eye, very simple
- [ ] 3. Empty elixir bottle and a drop
- [ ] 4. Still pool reflecting a moon
- [ ] 5. Prism or clear crystal
- [ ] Other:



### Heavy Sleeper

`action-4-wellRested` — Rest for 20 hours in total.

- [ ] 1. Simple bed or cot
- [ ] 2. Pillow and a folded blanket
- [ ] 3. Crescent moon over a hut
- [ ] 4. Closed eyelids, two curves
- [ ] 5. Nightcap on a bedpost
- [ ] Other:



### Solstice Celebrant

`action-4-solsticeGatherings` — Hold 10 Solstice gatherings.

- [ ] 1. Wreath around a tall flame
- [ ] 2. Circle of people as tiny marks around a fire
- [ ] 3. Sun disk low on the horizon
- [ ] 4. Garlanded pole
- [ ] 5. Feast platter and a candle
- [ ] Other:



### Investor

`action-4-investor` — Invest 2'500 gold in total.

- [ ] 1. Stack of gold coins
- [ ] 2. Coinhouse plaque or coin stamp
- [ ] 3. Gold flowing into a chest
- [ ] 4. Ledger and a coin
- [ ] 5. Sealed investment pouch
- [ ] Other:



### Lucky Investor

`action-4-luckyInvestor` — Succeed on 10 investments.

- [ ] 1. Coin showing a lucky face
- [ ] 2. Overflowing coin purse
- [ ] 3. Four-leaf mark on a coin
- [ ] 4. Two coins, one catching light
- [ ] 5. Small chest bursting with coins
- [ ] Other:



### Insightful

`action-4-insightful` — Spend 10'000 Insight in total.

- [ ] 1. Single staring eye
- [ ] 2. Insight drop or tear-shaped gem
- [ ] 3. Open book with an eye mark
- [ ] 4. Lamp of inner light
- [ ] 5. Spiral of thought, few lines
- [ ] Other:



### Pile of Dead

`action-4-pileOfDead` — Lose 250 villagers in total.

- [ ] 1. Small mound with a single marker stone
- [ ] 2. Three simple graves
- [ ] 3. Fallen figure as a cloak shape (no gore)
- [ ] 4. Skull on a pile of earth
- [ ] 5. Broken hoe beside a mound
- [ ] Other:

---



## Overall



### Normal Victory

`overall-0-winNormal` — Win a game on Normal.

- [ ] 1. Cave mouth with a sun beyond
- [ ] 2. Laurel wreath around a small flame
- [ ] 3. Upright iron key
- [ ] 4. Cave arch with a sunburst
- [ ] 5. Banner with a cave-arch mark
- [ ] Other:



### Cruel Victory

`overall-0-winCruel` — Win a game on Cruel.

- [ ] 1. Cave mouth under a thorned sun
- [ ] 2. Laurel of thorns around a flame
- [ ] 3. Broken key still opening a lock
- [ ] 4. Dark cave, thin red dawn
- [ ] 5. Banner torn, still upright
- [ ] Other:



### Cave Veteran

`overall-0-caveVeteran` — Win 3 games.

- [ ] 1. Three cave mouths in a row
- [ ] 2. Three notches on a torch haft
- [ ] 3. Worn helmet or hood
- [ ] 4. Three stacked victory keys
- [ ] 5. Old map with three X marks
- [ ] Other:



### Speedrunner

`overall-0-speedrunner` — Win a game in under 5 hours.

- [ ] 1. Hourglass nearly empty
- [ ] 2. Torch burning very short
- [ ] 3. Streaked cave arch, motion lines
- [ ] 4. Sundial with a short shadow
- [ ] 5. Winged hourglass
- [ ] Other:



### Enduring

`overall-0-endurant` — Play for 30 hours across all games.

- [ ] 1. Hourglass still full
- [ ] 2. Long-burning hearth
- [ ] 3. Notched tally stick, many marks
- [ ] 4. Candle burned to a stub
- [ ] 5. Deep-rooted tree stump
- [ ] Other:



### Resource Maxer

`overall-0-resourceMaxer` — Hit Great Vault capacity with every capped resource.

- [ ] 1. Overflowing vault chest
- [ ] 2. Vault door with a full-bar mark
- [ ] 3. Stacked crates to the frame edge
- [ ] 4. Great key and a bursting chest
- [ ] 5. Silo or vault arch stuffed with goods
- [ ] Other:



### Upgrade Maxer

`overall-0-upgradeMaxer` — Max every upgrade in the Estate tab.

- [ ] 1. Estate manor gable
- [ ] 2. Crest with a completed ring
- [ ] 3. Ladder at the top rung
- [ ] 4. Crown of simple tools
- [ ] 5. Fully grown estate tree
- [ ] Other:



### Achievement Maxer

`overall-0-achievementMaxer` — Complete every non-Epic achievement.

- [ ] 1. Full ring of small seals
- [ ] 2. Laurel and a central star
- [ ] 3. Closed book stamped complete
- [ ] 4. Stack of claimed tokens
- [ ] 5. Cave arch filled with a sun
- [ ] Other:

---



## Pick status

Fill this when you are done, or leave it and just mark the boxes above.


| Id                          | Pick |
| --------------------------- | ---- |
| basic-0-woodGatherer        | basic-0-woodGatherer.png |
| basic-0-stoneMiner          | basic-0-stoneMiner.png (v17) |
| basic-0-ironMiner           | basic-0-ironMiner.png |
| basic-0-coalMiner           | basic-0-coalMiner.png |
| basic-0-steelForger         | basic-0-steelForger.png |
| basic-0-hunter              | basic-0-hunter.png |
| basic-0-tanner              | basic-0-tanner.png |
| basic-1-explorer            | basic-1-explorer.png |
| basic-1-torchCrafter        | basic-1-torchCrafter.png |
| basic-1-toolCrafter         | basic-1-toolCrafter.png |
| basic-1-builder             | basic-1-builder.png |
| basic-1-communityBuilder    | basic-1-communityBuilder.png |
| building-0-0                |      |
| building-0-1                |      |
| building-0-2                |      |
| building-0-3                |      |
| building-1-0                |      |
| building-1-1                |      |
| building-1-2                |      |
| building-1-3                |      |
| building-2-0                |      |
| building-3-0                |      |
| building-3-1                |      |
| building-3-2                |      |
| building-3-3                |      |
| building-4-0                |      |
| building-4-1                |      |
| item-0-axes                 |      |
| item-0-pickaxes             |      |
| item-0-lanterns             |      |
| item-1-swords               |      |
| item-1-bows                 |      |
| item-2-explorer_pack        |      |
| item-2-schematic_weapons    |      |
| item-3-ancient_books        |      |
| item-3-fellowship           |      |
| item-4-blacksteel_tools     |      |
| item-4-blacksteel_equipment |      |
| action-0-exploreCave        |      |
| action-0-chopWood           |      |
| action-0-hunt               |      |
| action-0-craftTorches       |      |
| action-1-mineStone          |      |
| action-1-mineIron           |      |
| action-1-mineCoal           |      |
| action-1-mineSulfur         |      |
| action-1-mineObsidian       |      |
| action-1-mineAdamant        |      |
| action-1-mineMoonstone      |      |
| action-2-boneTotems         |      |
| action-2-leatherTotems      |      |
| action-2-animals            |      |
| action-2-craftBoneTotems    |      |
| action-2-craftLeatherTotems |      |
| action-3-emberBombs         |      |
| action-3-ashfireBombs       |      |
| action-3-veinfireElixir     |      |
| action-3-burningVeins       |      |
| action-4-merchantPurchases  |      |
| action-0-gamblerWins        |      |
| action-4-feedFire           |      |
| action-4-mentalClarity      |      |
| action-4-wellRested         |      |
| action-4-solsticeGatherings |      |
| action-4-investor           |      |
| action-4-luckyInvestor      |      |
| action-4-insightful         |      |
| action-4-pileOfDead         |      |
| overall-0-winNormal         |      |
| overall-0-winCruel          |      |
| overall-0-caveVeteran       |      |
| overall-0-speedrunner       |      |
| overall-0-endurant          |      |
| overall-0-resourceMaxer     |      |
| overall-0-upgradeMaxer      |      |
| overall-0-achievementMaxer  |      |


