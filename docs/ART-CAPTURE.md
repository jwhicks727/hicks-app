# Photographing Laurie's paintings

The aim is a true record of each painting: colours that match the painting
on the wall, square edges, no glare. That's good enough to print from, and
good enough for the app. Setting up takes about half an hour the first
time. After that, each painting takes a few minutes.

## Her yes comes first

- A painting goes into the app only when Laurie says yes to that piece. She
  chooses where it goes: a season, the Life List, or a bird's page.
- Her paintings are never given to an AI image tool, never used to train or
  "inspire" one, and never posted anywhere by the app.
- Once the app is hosted, any file in `public/` can be opened by anyone who
  knows its address, without signing in. A painting she's happy to share can
  go there. Any other painting waits for private storage behind sign-in
  (docs/PLAN.md).

## What you need

- **The tripod,** with a phone clamp if you're using the phone.
- **Even light:**
  - two matching lamps, the same bulbs; or
  - bright shade or an overcast day by a big window.

  Never direct sun, and never the flash.
- **The colour strip:** a grey card or a colour chart, such as an 18% grey
  card or a ColorChecker Passport.
- A level (the phone's own will do), painter's tape and a tape measure.
- **For varnished or glossy paintings,** optionally:
  - polarising film for the lamps;
  - a polarising filter for the lens.

  Crossed at right angles, they take the shine away completely.

## Set up once

1. **Hang the painting flat on a wall,** at about chest height.
   - Paper can be held flat with painter's tape on its back edge, or under
     a sheet of clean glass. If you use glass, watch for reflections.
   - Pieces small enough for the scanner are easier there (see below).
2. **Square the camera to the painting:**
   - the lens level with the painting's centre;
   - the phone or camera perfectly upright, with the level reading 0°;
   - nothing tilted, so the edges come out straight.
3. **Use the phone's 2× lens and step back,** rather than going close with
   the wide lens. The wide lens bends straight edges. Fill about 80% of the
   frame; you'll crop later.
4. **Lamps:** one each side.
   - Put them at 45° to the painting, the same distance away (about 1 to
     1.5 m) and level with its centre.
   - Turn off the room lights: two colours of light can't both be
     corrected.
5. **Check the light is even.** Photograph the grey card at each corner and
   in the middle. All five should come out equally bright. If one corner is
   darker, move that lamp back or turn it slightly.
6. **Glare:** if thick paint or varnish catches the light, move the lamps
   further out to the sides. If that isn't enough, use the polarisers.

## Each painting

1. **Take two shots without moving anything:**
   - first with the grey card or chart held flat against the painting's
     surface;
   - then the painting alone.

   The first shot is only for setting the colour.
2. **Camera settings:**
   - **iPhone:** turn on ProRAW (Settings › Camera › Formats). Tap and hold
     on the painting to lock focus and exposure. Use the 3-second timer, or
     an Apple Watch as the shutter, so the tap doesn't shake the tripod.
   - **Android:** use Pro mode with RAW (DNG) on, the lowest ISO, and focus
     on the painting. White balance is "daylight", or set it from the card.
     Use the timer.
   - **A camera:** RAW, ISO 100, f/8, the 2-second timer, and daylight
     white balance. Any shutter speed is fine on the tripod.
   - **Off:**
     - HDR and Smart HDR;
     - scene optimiser;
     - beauty, portrait and filters;
     - auto-enhance.
3. **Zoom in on the screen** to check the shot is sharp. If you're unsure
   of the exposure, take one shot a little darker and one a little lighter.
4. **Write it down:** title, year, medium, size, and where the painting is
   now.

## Setting the colour (what the strip is for)

In Lightroom (the free phone version works), Apple Photos or Snapseed:

1. Open the shot with the card. Click the white-balance eyedropper on the
   grey card, or on the chart's middle grey patch.
2. Set the exposure so the grey card reads mid-grey, around 120 on each of
   R, G and B.
3. Copy those settings to the painting-only shot.
4. Don't add contrast, saturation or "vibrance". The goal is the painting
   as it looks on the wall, not a brighter version of it.
5. Fix the perspective (Lightroom's Upright, or Transform) and crop to the
   painting's edge.
6. Check the result against the painting in daylight, with the screen
   bright and Night Shift and True Tone off.

With a ColorChecker Passport, its free app can build a profile for your
camera from the chart shot. Lightroom then applies that profile. That is
the most accurate colour you can get without a lab.

## Small pieces: the flatbed scanner

For anything that fits the glass and has no thick paint:

- **Scanner settings:**
  - 600 dpi;
  - 48-bit colour (16 bits per channel).
- **Off:** every automatic fix:
  - sharpening;
  - descreening;
  - colour restoration;
  - dust removal;
  - "photo enhance".
- **Profile the scanner once.** VueScan and SilverFast can both do this
  from an IT8 target. Every scan afterwards uses the profile.
- **A piece larger than the glass:** scan it in overlapping parts and
  stitch them with Photoshop's Photomerge, or Hugin (free).

## Files

- **Keep the original** (RAW, DNG or the 48-bit scan) and a corrected
  16-bit TIFF. Never write over either.
- **Name each file** `year-title-medium`, in lower case with hyphens. For
  example: `2024-red-tailed-hawk-watercolor.tif`.
- **Back up to two places,** for example the iMac and the family's cloud
  drive.
- **For the app:** export a JPEG with the same name, sRGB, 2400 px on the
  long side, quality about 85.

## Into the app

- **The painting:** save its JPEG as `public/paintings/<slug>.jpg`, with a
  720 px copy as `<slug>-720.jpg` for the gallery. Add its line to
  `PAINTINGS` in `src/lib/paintings.js`, newest first:
  - title and whether it's her title (`named`);
  - year, medium and size, only as she gives them;
  - its size in pixels;
  - `focus`, the part a panel shows.

  It appears in her gallery (`/lifelist/paintings`) and gets its own page.
- **A season:** list the season in the painting's `seasons`, for example
  `['halloween']`. It then shows faintly along the bottom of every screen
  in that season, and in the Paintings panel on Home. The bottom of the
  painting shows most, so a wide painting suits it best.
- **A bird that flies:** `scripts/lift-bird.py` lifts a bird out of the
  painting. Give its `flyer` the two boxes the script prints. The painting
  itself is never changed.
- **Credit:** each painting gets a line in README.md's credits, with its
  title, year and medium, saying it is Laurie's and used with her
  permission.
- **Later:** bird paintings replace the bird's photo on its Life List page.

## The short version

1. Get her yes for that painting.
2. Hang it flat. Put the tripod square to it, with the lens level with its
   centre.
3. Light it with two lamps at 45°, or even daylight, with the room lights
   off.
4. Take one shot with the grey card, then one without, in RAW with the
   timer and HDR off.
5. Set the white balance from the card, copy it across, and straighten
   and crop.
6. Keep the RAW and a 16-bit TIFF; export a 2400 px sRGB JPEG for the app.
