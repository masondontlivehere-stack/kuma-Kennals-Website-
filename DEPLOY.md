# Putting Kuma Kennels online

This takes about 20 minutes, once. Everything here is on free plans.

You'll set up two accounts:

- **Cloudflare** hosts the website, runs the application form, and stores applications in a database.
- **Resend** sends you an email whenever someone applies.

The site works without Resend — applications are still saved and visible in your dashboard — you just won't get an email alert until Resend is set up.

---

## 1. Put the site on Cloudflare

1. Create a free account at **cloudflare.com**.
2. In the dashboard, open **Workers & Pages** → **Create**. If it offers Workers first, look for the **Pages** option ("Looking to deploy Pages? Get started").
3. Choose **Connect to Git** (or **Import an existing Git repository**), sign in to GitHub, and pick the `kuma-Kennals-Website-` repository.
4. Build settings:
   - **Production branch:** `main` (merge this work into `main` first, or pick the branch it's on)
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
5. Click **Save and Deploy**. You'll get an address like `kuma-kennels.pages.dev`.

The pages are live now. The form needs the next two steps before it can save anything.

## 2. Create the database

1. In the Cloudflare dashboard, open **Storage & Databases** → **D1 SQL Database** → **Create**.
2. Name it `kuma-kennels` and create it. You don't need to add tables — the site creates them itself the first time someone applies.
3. Go back to your Pages project → **Settings** → **Bindings** → **Add** → **D1 database**.
   - **Variable name:** `DB` (exactly that, capital letters)
   - **D1 database:** `kuma-kennels`
4. Save.

## 3. Set your dashboard password

In your Pages project → **Settings** → **Variables and Secrets** → **Add**:

| Name | Type | Value |
| --- | --- | --- |
| `ADMIN_PASSWORD` | Secret | A password of **at least 12 characters**. This is how you sign in to the dashboard. |

Save, then go to **Deployments** and **Retry deployment** (or push any change) so the new settings take effect.

Your dashboard is now at **`https://YOUR-SITE/admin/`**.

## 4. Get an email for every application (Resend)

1. Create a free account at **resend.com** using the email address where you want alerts.
2. In Resend, open **API Keys** → **Create API Key** (sending access is enough). Copy it — it starts with `re_`.
3. Back in Cloudflare → your Pages project → **Settings** → **Variables and Secrets**, add:

| Name | Type | Value |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | The key from Resend |
| `NOTIFY_EMAIL` | Text | The email you signed up to Resend with |

4. Redeploy (Deployments → Retry deployment).

Each alert includes everything the applicant entered and a button that opens their record in the dashboard. **Hitting Reply answers the applicant directly.**

> Until you verify your own domain in Resend, alerts come from `onboarding@resend.dev` and can only go to the address you signed up with. That's fine for alerts to yourself.

### Optional extras

| Name | What it does |
| --- | --- |
| `NOTIFY_EMAIL` with commas | Send alerts to more than one person: `you@x.com, partner@x.com` (needs a verified domain in Resend). |
| `NOTIFY_FROM` | Send from your own address, e.g. `Kuma Kennels <hello@yourdomain.com>`, once the domain is verified in Resend. |
| `CONFIRM_APPLICANTS` = `true` | Also email each applicant a short "we received your application" note. Needs `NOTIFY_FROM`. |

## 5. Test it

1. Open your site → **Reserve a puppy** → fill in the form → **Send application**. You should see "Application received" with a reference like `KK-0001`.
2. Check your email for the alert.
3. Open `/admin/`, sign in, and you'll see the application under **New**.

If the dashboard shows a yellow "Email alerts are off" note, step 4 isn't finished.

## Using your own domain

Pages project → **Custom domains** → **Set up a custom domain**, and follow the prompts.

---

## Using the dashboard

- **Tabs** filter by status: New, Contacted, Approved, Waitlist, Declined, All.
- **Click an application** to see everything they wrote, email or call them in one tap, change the status, and keep private notes.
- **Export CSV** downloads every application for a spreadsheet.
- The list refreshes on its own every minute, and the browser tab shows how many are new.

## Security, briefly

- The dashboard and its data are behind your password. Sessions last 12 hours; changing `ADMIN_PASSWORD` signs everyone out.
- After 8 wrong passwords in 15 minutes, sign-in pauses for that connection.
- Each connection can send 5 applications an hour. A hidden field and a timing check quietly discard most spam bots.
- Visitor IP addresses are never stored — only a one-way fingerprint used for those limits.

## Working on the site locally (optional, for developers)

```bash
npm install
cp .dev.vars.example .dev.vars    # set ADMIN_PASSWORD in it
npm run dev                       # http://127.0.0.1:8788 — site, form and dashboard with a local database
```
