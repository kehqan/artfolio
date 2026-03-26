# Artfolio — Platform for Artists & Galleries

A Next.js platform where artists and galleries can manage artwork inventory, build portfolios, organize collections, and connect with the art community.

## Quick Start (Local Development)

1. **Install Node.js** from https://nodejs.org (download the LTS version)
2. **Unzip** this project folder
3. **Open Terminal** (Mac) or **Command Prompt** (Windows) and navigate to the project:
   ```
   cd artfolio
   ```
4. **Install dependencies:**
   ```
   npm install
   ```
5. **Start the development server:**
   ```
   npm run dev
   ```
6. **Open your browser** at http://localhost:3000

## Deploy to Vercel (Step by Step)

### Option A: Deploy via GitHub (Recommended)

1. **Create a GitHub account** at https://github.com if you don't have one
2. **Download GitHub Desktop** from https://desktop.github.com
3. **Create a new repository:**
   - Open GitHub Desktop
   - Click "File" → "Add Local Repository"
   - Select the artfolio folder
   - If it says "not a git repo", click "Create Repository"
   - Add a name like "artfolio"
   - Click "Create Repository"
4. **Push to GitHub:**
   - Click "Publish Repository" in GitHub Desktop
   - Keep it private or public, your choice
   - Click "Publish Repository"
5. **Connect to Vercel:**
   - Go to https://vercel.com and sign up with your GitHub account
   - Click "Add New Project"
   - Find "artfolio" in your repository list
   - Click "Import"
   - Leave all settings as default
   - Click "Deploy"
   - Wait 1-2 minutes — your site is live!

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel` and follow the prompts
3. For production: `vercel --prod`

## Project Structure

```
artfolio/
├── src/
│   ├── app/              ← All pages live here
│   │   ├── page.tsx      ← Landing page (home)
│   │   ├── layout.tsx    ← Root layout (shared by all pages)
│   │   ├── globals.css   ← Global styles
│   │   ├── features/     ← /features page
│   │   ├── about/        ← /about page
│   │   ├── login/        ← /login page
│   │   └── register/     ← /register page
│   ├── components/       ← Reusable UI components
│   │   ├── Navbar.tsx    ← Navigation bar
│   │   └── Footer.tsx    ← Footer
│   └── lib/              ← Utilities (for Phase 2+)
├── package.json          ← Project dependencies
├── tailwind.config.ts    ← Tailwind CSS theme
├── tsconfig.json         ← TypeScript config
└── next.config.js        ← Next.js config
```

## Phase Roadmap

- [x] Phase 1 — Landing Page, Features, About, Login, Register
- [ ] Phase 2 — Authentication (Supabase)
- [ ] Phase 3 — Dashboard
- [ ] Phase 4 — Artwork Inventory System
- [ ] Phase 5 — Collections
- [ ] Phase 6 — Portfolio Pages
- [ ] Phase 7 — Social Feed

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Icons:** Lucide React
- **Deployment:** Vercel
- **Database:** Supabase (Phase 2)
