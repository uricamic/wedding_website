# Wedding Website - Alina & Michal

Static, mobile-first wedding website in Czech, English, and Ukrainian, designed for GitHub Pages with optional real backend via Supabase.

## Features

- Elegant pink-lila design with explicit Moravian Vnorovsky and Ukrainian vyshyvanka-inspired ornaments.
- Language switcher (`CZ`, `EN`, `UA`) with persisted selection.
- Story, timeline, gallery, RSVP form, contacts, and future seating-plan section.
- RSVP fields now include accommodation needs and seating preference.
- Optional admin dashboard (`admin.html`) for RSVP overview.
- No build step required.

## Project Structure

- `index.html` - Main website.
- `styles.css` - Styling and responsive behavior.
- `script.js` - Translations, gallery, RSVP submission logic.
- `admin.html` - RSVP admin dashboard UI.
- `admin.js` - Admin login and RSVP data loading.
- `config.js` - Local runtime configuration (Supabase keys).
- `config.example.js` - Configuration template.
- `supabase-schema.sql` - Database schema and RLS policies.
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow.

## Local Preview

Open `index.html` directly in your browser.

If Supabase is not configured, RSVP will still work in preview mode by saving response data to browser `localStorage`.

## GitHub Pages Deployment

1. Create a GitHub repository and push this project.
2. In repository settings, open `Pages` and set source to `GitHub Actions`.
3. Ensure default branch is `main`.
4. Push to `main`; workflow `.github/workflows/deploy-pages.yml` deploys automatically.

### Troubleshooting: `Get Pages site failed` / `Not Found`

- The workflow already includes `enablement: true` for `actions/configure-pages`, so it can initialize Pages automatically.
- If deployment still fails, verify you have admin rights on the repository.
- In organization repositories, ensure GitHub Pages is allowed by org policy.
- Confirm you are pushing to `main` (the workflow trigger branch).

## Real Backend With Supabase

1. Create a free Supabase project.
2. Run SQL from `supabase-schema.sql` in Supabase SQL editor.
3. Copy `config.example.js` to `config.js` and fill:
	- `supabaseUrl`
	- `supabaseAnonKey`
4. Commit `config.js` with your public keys (anon key is safe for frontend use).
5. Open `admin.html` and log in with magic link to see RSVP dashboard.

## Important Security Note

- Reading RSVP rows is restricted to authenticated users by RLS policy.
- Public website visitors can insert RSVP rows only.

## Future Seating Plan

- A dedicated section is already prepared in the UI (`#seating`).
- Existing RSVP schema includes `seating_preference` so migration to full table-seat assignment is straightforward.
