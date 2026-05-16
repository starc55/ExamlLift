# Production Checklist

## Domain And SEO

- Set `VITE_SITE_URL` to the final production domain, for example `https://aesac.co`.
- Run `npm run generate:sitemap` after changing the domain.
- Confirm these URLs work after deploy:
  - `/robots.txt`
  - `/sitemap.xml`
  - `/login`
  - `/register`
- Submit `https://aesac.co/sitemap.xml` in Google Search Console.

## Required Environment Variables

- `VITE_SITE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

## Supabase

- Auth is required for protected routes.
- The `profiles` table must contain `id`, `full_name`, `email`, `role`, and `created_at`.
- Role values must match the app roles: `teacher`, `student`, `admin`.
- Row Level Security policies should allow users to access only their allowed records.
- Storage bucket `content-files` must exist and allow the app's intended upload/read policy.

## AI Feedback

- `/api/ai-feedback` requires `OPENAI_API_KEY`.
- `/api/transcribe-speaking` requires `OPENAI_API_KEY`.
- Local scored sections can still score locally, but AI summary requires the API key.

## Protected Routes

- Public routes:
  - `/`
  - `/login`
  - `/register`
- Protected student routes are under `/student/*`.
- Protected teacher routes are under `/teacher/*`.
- Unknown routes render the professional 404 page.

## Mobile QA

- Check login/register on 360px, 390px, 768px, and desktop widths.
- Check teacher Manage Tests modal with 4 or more accordion tasks.
- Check upload forms and homework submissions on mobile.
- Check table-like result/detail sections for horizontal overflow.

## Build

- `npm run build` must pass.
- Vite chunk-size warnings are non-blocking, but can be optimized later with route-level code splitting.
