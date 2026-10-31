# Our crucifixes, illustrated, on the Church's great days

The family's own crucifixes, photographed and made into flat, inked
illustrations, appear on the days that are about the Cross. They're drawn
from our own things, not stock art, and not made by an image generator.

## Photographing one

The same care as Laurie's paintings (docs/ART-CAPTURE.md), with one
difference: **a plain background in a contrasting colour**. A white sheet
suits dark wood and a dark cloth suits light metal, so the illustration
step can clear it away.

- Lay the crucifix flat, or hang it against the backdrop, with the camera
  square to it and even light from two sides.
- Fill most of the frame and keep the whole of it in.
- One photo for each crucifix. Note where it hangs and anything it means
  to us (whose it was, where it came from).

## Making the illustration

On a computer with Python 3, Pillow and numpy:

```sh
python3 scripts/lift-art.py illustrate photo.jpg crucifix-name.png --colours 7
```

The step finds the photo's own colours, flattens them, cleans the speckle,
outlines where they meet, and clears the background. Fewer colours
(`--colours 5`) give a bolder, simpler look; more give a truer one.

## Where they appear (to build once the photos are in)

- **The Church card,** on Home and on the day in the Calendar, on:
  - Ash Wednesday;
  - Palm Sunday;
  - Good Friday;
  - the Exaltation of the Holy Cross (September 14);
  - the Sacred Heart.

  Each is held gently in the day's liturgical colour.
- **Fridays in Lent,** small and quiet.
- They live behind sign-in, like the paintings, in private storage
  (docs/PAINTINGS-STORAGE.md), each with a note of whose it is.
