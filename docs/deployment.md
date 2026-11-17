# Deployment Guide

ApexBuild is designed to deploy to **two independent Vercel projects** and a single **Supabase Cloud project**.

## 1. Supabase Cloud Configuration
1. Create a project at [database.new](https://database.new).
2. Apply every file in `supabase/migrations/` in filename order. The easiest way is the CLI:
   `supabase link --project-ref <ref>` then `supabase db push`.
   (The current project, `ctbpkaqyddceacjlujpi`, already has all 13 applied.)
3. Go to **Authentication -> URL Configuration**:
   - **Site URL**: `https://<your-web-app>.vercel.app` (or `http://localhost:5173` locally)
   - **Redirect URLs**:
     - `https://<your-web-app>.vercel.app/auth/callback`
     - `http://localhost:5173/auth/callback`
4. Go to **Authentication -> Providers -> Google**:
   - Enable Google.
   - Enter your Google Client ID and Google Client Secret.
   - Copy the Callback URL provided by Supabase (e.g. `https://<project-ref>.supabase.co/auth/v1/callback`) and paste it into the Google Cloud Console under "Authorized redirect URIs".

## 2. Vercel Project 1: Landing Page (`apps/landing`)
- **Git Repository**: Connect this repository.
- **Root Directory**: `apps/landing`
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Environment Variables**:
  - `NEXT_PUBLIC_APP_URL`: URL of your deployed Web app (e.g. `https://<your-web-app>.vercel.app`)
  - `NEXT_PUBLIC_SITE_URL`: URL of the landing page (e.g. `https://<your-landing-app>.vercel.app`)

## 3. Vercel Project 2: Product App (`apps/web`)
- **Git Repository**: Connect this repository.
- **Root Directory**: `apps/web`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **SPA Fallback**: Configured via `apps/web/vercel.json` rewrite (`/*` -> `/index.html`).
- **Environment Variables**:
  - `VITE_APP_URL`: URL of this deployed Web app.
  - `VITE_LANDING_URL`: URL of the landing page.
  - `VITE_SUPABASE_URL`: `https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: `eyJhbGciOi...` (Anon/Publishable key)
  - `VITE_DISPLAY_TIMEZONE`: `Asia/Kolkata`

