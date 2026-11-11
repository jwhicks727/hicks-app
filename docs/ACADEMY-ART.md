# Art for Anna's academy

Everything in the academy's rooms is human-made art with its licence
written down. Nothing is made by an image generator.

## What's there now

- **Fluent Emoji, by Microsoft** (MIT licence): 245 pictures, from chairs
  and globes to cats, trophies and telescopes. They're drawn once to small
  WebP files in `public/academy/items/` by `scripts/academy-art.mjs`, which
  reads the data from the npm package `@iconify-json/fluent-emoji@1.2.7`
  (nothing from the package runs). The licence is beside them, in
  `public/academy/LICENSE-fluent-emoji.txt`. To add one: put its name in
  `src/academy/items.js` and run the script again (its first lines say how).
- **The rooms themselves** (floors, walls, windows, clocks, shelves,
  curtains, stained glass) and the campus are drawn in code, in
  `src/academy/RoomScene.jsx` and `Campus.jsx`.
- **The air** is drawn in code too, in `src/academy/Atmosphere.jsx`: the
  sun, the moon in its phase, far hills, clouds, rain, snow, fog, a
  storm's flash, birds, fireflies, smoke, steam, bubbles, notes and
  sparkles. No picture files, and no image generator. What it shows is
  home's real sky (`src/academy/atmosphere.js`; decisions log, 2026-11-11).

## Adding pictures of your own

Academy › the pencil by the school's name › "Pictures the family has
added". Parents only. Each picture needs:

- a PNG or WebP, up to 2 MB, ideally one object on a clear background,
  cropped close, about 256 px;
- its **licence**, in words: "CC0 (Kenney)", "Bought from …, personal use",
  "Drawn by Anna";
- where it came from.

It lands in the private `academy` bucket and appears in every room's "Add
something", under "Ours", where it can be moved, sized, flipped and
recoloured like anything else.

Each picture is also filed by **what it does in a room** (chosen when it's
added; a parent can change it after, on the same page):

- **It stays put**: furniture, and anything else.
- **It wanders**: a pet or an animal. It strolls a square or two from where
  it was put, breathes, and sleeps at night. Only on screen: it is always
  back on its own square when the room is arranged.
- **It gives light**: a lamp, a lantern, a fire. It glows once it's dark.

A pet reads best as one picture facing the front or three-quarters, cropped
close, with a clear background. A sprite sheet's walking frames aren't used
yet (docs/PLAN.md).

## Packs that fit

The rooms are drawn at the common 2:1 isometric angle. Packs rendered at
a slightly different angle still sit well as single objects. Licences
below are as each seller's page described them when this was written:
check the page again before buying (unverified until then).

| Pack | Licence | Price | Notes |
|---|---|---|---|
| [Kenney Furniture Kit](https://opengameart.org/content/furniture-kit) | CC0 (credit welcome, not required) | Free | Furniture and fixtures, with isometric renders from four sides. The best first pack. |
| [Kenney Isometric Miniature Dungeon](https://opengameart.org/content/isometric-miniature-dungeon) | CC0 | Free | Stone, barrels, torches: a castle wing or a dragon's library. |
| [Isometric Voxel Room Furniture](https://pablogamedev.itch.io/isometric-voxel-room-furniture-png) | Personal or commercial use; no resale | About $5 | Chunky voxel furniture. |
| [Isometric Interior](https://mrmerowind.itch.io/isometric-interior) | Use allowed; no resale | About $5 | |
| [Essential Isometric Bedroom Pack](https://oisougabo.itch.io/essential-isometric-bedroom-pack) | Use and modify; credit requested | Varies | Dorm-room pieces. |
| [Ultimate Isometric Interior Pack](https://penzilla.itch.io/ultimate-interior-pack) | Royalty-free (licence text unverified) | $10+ | Large; check its licence first. |

A drawing of Anna's own, photographed on white paper and cut out, is
always welcome: licence "Drawn by Anna".
