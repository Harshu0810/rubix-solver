# RuBiX Solver — Deployment & Production Setup Guide

This guide walks you through setting up and deploying the **RuBiX Solver** web application completely on the **free tiers** of:
1. **Supabase** (`supabase.com`) — Backend database & real authentication
2. **GitHub** (`github.com`) — Source control & CI/CD trigger
3. **Vercel** (`vercel.com`) — Global edge hosting & automated deployments

---

## 📋 Architectural Overview & Security Model

- **No Hardcoded Secrets**: Zero passwords or client hashes are shipped in the production bundle.
- **Server-Side Authentication**: User and admin authentication is handled by Supabase Auth with cryptographically signed JWT tokens persisted securely.
- **Postgres Row Level Security (RLS)**: Access controls are enforced inside the database engine. Anonymous visitors can compute solutions and submit telemetry/guest feedback, while authenticated users can attach their profile to feedback and unlock solution downloads. Only administrators can read administrative analytics and manage feedback.
- **Client Fallback**: If Supabase credentials are not configured yet during local development, the app operates gracefully in offline demo mode.

---

## 🚀 Step 1: Supabase Setup (Free Tier)

### 1.1 Create a Free Project
1. Go to [supabase.com](https://supabase.com) and click **Start your project** (or sign in with GitHub).
2. Click **New Project** and select your organization.
3. Enter project details:
   - **Name**: `rubix-solver` (or any name you prefer)
   - **Database Password**: Enter a secure password (store it safely)
   - **Region**: Select the region closest to your primary audience
   - **Pricing Plan**: **Free tier** ($0/month)
4. Click **Create new project** and wait ~2 minutes for the database to provision.

### 1.2 Run the Database Schema
1. In your Supabase project dashboard, open the left sidebar and click **SQL Editor**.
2. Click **New Query**.
3. Open [`supabase/schema.sql`](./supabase/schema.sql) from this project, copy its entire contents, and paste them into the SQL Editor.
4. Click the green **Run** button (or press `Ctrl+Enter`).
5. You should see `Success. No rows returned`. This creates:
   - `public.profiles` (user display name, email, link to auth)
   - `public.sessions` (visitor tracking)
   - `public.events` (telemetry funnels)
   - `public.solves` (cube solve calculations & user attribution)
   - `public.feedback` (user ratings, reviews, guest vs registered tagging)
   - Automated user profile trigger on auth signup
   - All Row Level Security (RLS) policies and performance indexes

### 1.3 Create Your Admin Account
1. In the Supabase left sidebar, go to **Authentication** → **Users**.
2. Click **Add user** → **Create user**.
3. Enter your administrative credentials:
   - **Email**: e.g., `admin@yourdomain.com` (or your personal email)
   - **Password**: Choose a strong password
   - **Auto Confirm User?**: Check this box (so you don't need email verification to log in)
4. Click **Create user**.

### 1.4 Get Your API Keys
1. In the Supabase left sidebar, click the **Settings** gear icon (or **Project Settings**) → **API**.
2. Copy two values:
   - **Project URL**: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - **anon / public key**: `eyJhbGciOi...` (under "Project API keys")

---

## 💻 Step 2: Local Environment Verification

1. In the root of your project directory (`RuBiX_ CUBE`), create a `.env` file (copied from `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-public-key-here
   VITE_ADMIN_EMAIL=admin@yourdomain.com
   ```
3. Test locally:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
   - Solve a cube on `/input`
   - Click "Download / Print Guide" on the solution player → Verify the Sign In / Sign Up modal appears
   - Create a test account to unlock the printable cheat sheet
   - Visit `/admin` and log in with your admin credentials to verify the dashboard loads your telemetry and registered users!

---

## 🐙 Step 3: Push Code to GitHub

1. Ensure your `.env` is **NOT** committed (it is already in `.gitignore`):
   ```bash
   git status
   ```
2. Initialize and commit:
   ```bash
   git add .
   git commit -m "feat: complete Rubik solver with Supabase backend, user auth gating, and admin overhaul"
   ```
3. Create a repository on [github.com](https://github.com/new):
   - Name: `rubix-solver`
   - Visibility: Public or Private
4. Link your remote and push:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/rubix-solver.git
   git branch -M main
   git push -u origin main
   ```

---

## ▲ Step 4: Deploy to Vercel (Free Tier)

### 4.1 Import Repository
1. Go to [vercel.com](https://vercel.com) and log in (recommended: "Continue with GitHub").
2. In the Vercel dashboard, click **Add New...** → **Project**.
3. Find your `rubix-solver` repository from the GitHub list and click **Import**.

### 4.2 Configure Build & Environment Variables
1. **Framework Preset**: Vercel will automatically detect **Vite**.
   - Build Command: `vite build` (or `npm run build`)
   - Output Directory: `dist`
   - Install Command: `npm install`
2. Expand the **Environment Variables** section and add the 3 variables:
   - `VITE_SUPABASE_URL` = `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-actual-anon-public-key-here`
   - `VITE_ADMIN_EMAIL` = `admin@yourdomain.com`
3. Click **Deploy**.

Vercel will build the project in ~30 seconds and provide you with a live production URL (e.g. `https://rubix-solver.vercel.app`).

### 4.3 Custom Domain (Optional & Free)
1. In your Vercel project dashboard, navigate to **Settings** → **Domains**.
2. Enter your custom domain (e.g., `solver.yourdomain.com` or `yourdomain.com`).
3. Add the displayed DNS records (CNAME or A record) at your domain registrar. Vercel provisions a free automatic SSL certificate.

---

## 🔍 Features & Verification Checklist

| Feature | Behavior | Status |
|---|---|---|
| **Cube Solver Engine** | Kociemba 2-Phase Web Worker solver computing solutions in < 20ms | ✅ Working |
| **Interactive 3D Player** | Three.js rendering, play/pause, step controls, speed, interactive face rotation | ✅ Working |
| **Download Gating** | Unregistered users can solve freely; clicking download prompts sign-in | ✅ Active |
| **User Authentication** | Supabase Auth email/password with modal and navbar session badge | ✅ Active |
| **Printable Cheat Sheet** | High-contrast printable & text file download for signed-in cubers | ✅ Active |
| **Telemetry & Solves** | Stored in Supabase with `user_id` when logged in or anonymous | ✅ Active |
| **Feedback System** | Signed-in reviews display user email/name; guests labeled as `guest_user` | ✅ Active |
| **Admin Dashboard** | Real Supabase Auth (no hardcoded passwords); KPI cards, filterable reviews, registered users list | ✅ Active |
| **CSP & Security** | Content Security Policy configured to allow Supabase and Google Fonts safely | ✅ Active |
