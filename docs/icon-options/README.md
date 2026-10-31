# Home-screen icon options

The app's icon is made from one of these square pictures. Both are Jason's
ChatGPT reworkings of the app's sprout (Lucide's, ISC licence), kept as
stand-ins until a human-made icon replaces them (docs/DECISIONS-LOG.md).

| Picture | Status |
|---|---|
| `sprout-outline.png` | In use |
| `sprout-leafy.png` | Pinned, then set aside: too busy at home-screen size (Jason) |

`compare.png` shows both on a phone's home screen, as Android's circle and
as the browser tab's icon.

To switch, from the repository (needs Playwright's Chromium):

```sh
node scripts/make-icons.mjs docs/icon-options/sprout-leafy.png
```

That rewrites every size in `public/icons/`; update the table above and the
README's credits to match.
