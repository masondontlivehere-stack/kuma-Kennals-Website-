# Kuma Kennels

Website for Kuma Kennels — purebred Turkish Boz Shepherds in Eastern North Carolina.

**To put it online, follow [DEPLOY.md](DEPLOY.md).**

## What's here

```
public/                 The website (what visitors see)
  index.html            Home
  breed.html            The Turkish Boz Shepherd
  dogs.html             Our Dogs
  litters.html          Upcoming Litters
  past-litters.html     Past Litters
  reserve.html          Puppy application
  admin/                Breeder dashboard (password protected)
  assets/               Styles, scripts, fonts, photos, icons
  _headers              Security headers
functions/api/          Backend: receives applications, powers the dashboard
lib/                    Shared backend code (validation, database, email, security)
schema.sql              Reference copy of the database tables (created automatically)
```

Hosting is Cloudflare Pages, the database is Cloudflare D1, and email alerts go through Resend. All three have free plans that comfortably cover a breeder website.

## Common edits

Open the file on GitHub, click the pencil icon, edit, and commit — the site redeploys on its own.

- **Litter news** — `public/litters.html`, inside the block marked `EDIT ME`. Change the status pill (`Planned`, `Expected`, `Born — taking applications`, `Fully reserved`) and replace "To be announced" with dates.
- **Past litters** — `public/past-litters.html`, marked `EDIT ME`. Copy a whole `<article class="past-litter">` to add a litter. Fill in Born / Puppies, and add photos to its gallery.
- **New photos** — upload to `public/assets/img/` (JPEG, about 1600px on the long side is plenty), then point an `<img src="assets/img/…">` at it.
- **Ruby and Nala** — `public/dogs.html` has a "Photos coming soon" card for each; replace the `.pending` block with an image (instructions are in the comment above it).

## Design

- Type: Fraunces (headings) and Inter (text), self-hosted in `public/assets/fonts/`.
- Colors live at the top of `public/assets/css/style.css`. `--accent` is the brand orange; `--accent-ink` is the darker version used for small text so it stays readable.
- Motion: hero intro, scroll reveals, and fades between pages. All of it switches off for visitors who've asked their device to reduce motion.
