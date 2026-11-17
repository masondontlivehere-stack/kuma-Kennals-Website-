# Kuma Kennels

Static website for Kuma Kennels — pure Boz Shepherds in Eastern North Carolina.
No build step, no dependencies: plain HTML, one stylesheet, one small script.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `breed.html` | The Breed |
| `dogs.html` | Our Dogs |
| `litters.html` | Upcoming Litters |
| `reserve.html` | Reserve |

Shared files: `assets/css/style.css`, `assets/js/main.js`, photos in `assets/img/`.

## Run it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publishing

Any static host works. For GitHub Pages: repository **Settings → Pages →
Build and deployment → Deploy from a branch**, pick the branch and the `/ (root)` folder.

## Things to fill in

- **Contact details** — `reserve.html` has placeholder email, phone, and the
  `data-email` attribute on the form. Replace all three (marked `EDIT ME`).
  The form opens the visitor's email app with their answers; nothing is stored
  on the site. Swap in a form service (Formspree, Netlify Forms) if you want
  inquiries delivered without that step.
- **Litter board** — `litters.html`, section marked `EDIT ME`: update pairings,
  dates, and availability as litters are planned and born.
- **Photos of Ruby and Nala** — `dogs.html` shows a "Photo coming soon"
  placeholder for each. Drop the photos in `assets/img/` and replace the
  `<p class="photo-pending">…</p>` block with an `<img>` like the ones above it.

## Photo credits

Every photo on the site is the kennel's own: Tank, Talat, Paige, Zaina, and Kuma.

## Design notes

- Type: EB Garamond (headings) + Inter (body), loaded from Google Fonts.
- Color tokens live at the top of `assets/css/style.css`. `--accent` is the
  display orange; `--accent-text` and `--accent-btn` are the darker variants
  used wherever small text or button labels need WCAG AA contrast.
- Motion: one hero zoom on load plus scroll reveals, all disabled under
  `prefers-reduced-motion`. The site renders fully with JavaScript off.
