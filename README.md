# 🧊 RuBiX Solver — 3×3 Rubik's Cube 3D Solver Engine

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live_Demo-rubix--solver--chi.vercel.app-00DC82?style=for-the-badge&logo=vercel&logoColor=white)](https://rubix-solver-chi.vercel.app/)
[![Vite](https://img.shields.io/badge/Built_With-Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/3D_Engine-Three.js-black?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**An ultra-fast, state-of-the-art 3D Rubik's Cube solver with interactive playback, two-phase algorithmic computation, authenticated solution downloads, telemetry analytics, and a secure administration portal.**

[Explore Live Demo](https://rubix-solver-chi.vercel.app/) • [Report Bug](https://github.com/Harshu0810/rubix-solver/issues) • [Request Feature](https://github.com/Harshu0810/rubix-solver/issues)

</div>

---

## 🌟 Highlights & Key Features

- ⚡ **Instant Solves (< 20ms)**: Uses Herbert Kociemba's Two-Phase Algorithm running in a dedicated background Web Worker to compute near-optimal solutions (typically ~20 moves) in milliseconds without freezing the browser.
- 🎮 **Interactive 3D Media Player**: Full Three.js 3D viewport with interactive orbital controls, play/pause, step forward/backward, speed controls (`0.5x`, `1x`, `1.5x`, `2x`), scrubber progress bar, and celebratory particle animations upon completion.
- 🎨 **Intuitive Face Color Input**: Quick face-by-face color selection with full cube validation rules (centers, edge count, corner parity) to prevent unsolvable cube configurations.
- 🔐 **User Authentication & Download Gating**:
  - Anyone can solve cubes and read the beginner manual freely without signing in.
  - Custom solution cheat sheets and printable PDF/text exports are gated behind a secure, modal-driven authentication flow (Supabase Auth).
- 💬 **Differentiated Feedback Attribution**:
  - Anonymous visitors submit feedback attributed as `guest_user`.
  - Registered members submit reviews linked directly to their profile (name and email).
- 📊 **Secure Admin Console (`/admin`)**:
  - Zero hardcoded passwords or client-side hashes in source code or production bundles.
  - Server-side authentication powered by Supabase Auth and PostgreSQL **Row Level Security (RLS)**.
  - Live KPIs: Visitor sessions, total solves, sub-second compute latency, and registered member directory.
  - Interactive star filters (`5★`, `4★`, `3★`, `2★`, `1★`), solve audit trails, and JSON telemetry export.
- 📖 **Built-in Beginner Manual**: Step-by-step illustrated CFOP and Layer-by-Layer solving guide for beginners.
- 🛡️ **Offline & Local Dev Fallback**: Gracefully operates with offline mock data if Supabase keys are not set up locally.

---

## 🚀 Live Demo

Check out the live application hosted on Vercel:  
👉 **[https://rubix-solver-chi.vercel.app/](https://rubix-solver-chi.vercel.app/)**

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Core** | Native ES Modules (HTML5 / JS) | Zero heavyweight UI frameworks for maximum speed and sub-second load times |
| **Styling** | Vanilla CSS3 | Custom dark glassmorphic design system with CSS custom properties |
| **3D Rendering** | Three.js | High-performance WebGL cube rendering with smooth quaternions and slice animations |
| **Solver Worker** | Kociemba Algorithm | Pure JavaScript port running asynchronously in an isolated `Worker` thread |
| **Backend & Auth** | Supabase (PostgreSQL) | User session management, profile triggers, solve records, and RLS security policies |
| **Build & Bundler** | Vite 6 | Lightning-fast development server and optimized Rollup production builds |
| **Deployment** | Vercel | Global edge CDN network with automatic continuous deployment |

---

## 📁 Repository Structure

```
rubix-solver/
├── public/                 # Static assets and icons
├── src/
│   ├── 3d/                 # Three.js 3D cube renderer and slice animators
│   │   ├── cube-renderer.js
│   │   └── cube-animator.js
│   ├── components/         # Reusable glassmorphic UI components
│   │   └── auth-modal.js   # Sign-in / sign-up overlay modal
│   ├── cube/               # Rubik's cube state modeling, validation & notation
│   │   ├── cube-state.js
│   │   ├── cube-validator.js
│   │   ├── cube-moves.js
│   │   └── cube-conversion.js
│   ├── pages/              # Single-page application view routers
│   │   ├── landing.js      # Hero landing page with feature cards
│   │   ├── face-input.js   # 6-face color palette configuration
│   │   ├── solution-player.js # Interactive 3D step navigator
│   │   ├── print-solution.js  # Auth-gated printable cheat sheet & text export
│   │   ├── manual.js       # Comprehensive cubing tutorial & handbook
│   │   ├── feedback.js     # User ratings (guest vs. authenticated)
│   │   ├── analytics.js    # Supabase telemetry & solve logging service
│   │   └── admin.js        # Protected administrative analytics console
│   ├── solver/             # Two-Phase Kociemba algorithm & Web Worker
│   │   ├── solver-manager.js
│   │   ├── solver-worker.js
│   │   └── vendor/cubejs/
│   ├── styles/             # Modular CSS design system & micro-animations
│   │   ├── index.css
│   │   └── animations.css
│   ├── utils/              # Client singletons & security helpers
│   │   ├── supabase-client.js
│   │   ├── auth-service.js
│   │   └── security.js     # Input sanitization and XSS mitigation
│   └── app.js              # Client-side router & navbar controller
├── supabase/
│   └── schema.sql          # Postgres schema, profiles trigger, and RLS policies
├── index.html              # HTML5 entry point with Content Security Policy (CSP)
├── vite.config.js          # Vite configuration
├── package.json
└── README.md
```

---

## 🛠️ Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/Harshu0810/rubix-solver.git
cd rubix-solver
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables (Optional)
To enable live backend features (user sign-up, telemetry, and real admin authentication):
1. Create a free project at [supabase.com](https://supabase.com).
2. Run the SQL schema from [`supabase/schema.sql`](./supabase/schema.sql) in the **SQL Editor**.
3. Copy [`.env.example`](./.env.example) to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Fill in your project keys:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   VITE_ADMIN_EMAIL=admin@example.com
   ```
*(Note: If no `.env` is provided, the app will run in offline demo mode seamlessly).*

### 4. Start the dev server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 5. Production build
```bash
npm run build
```

---

## 🔒 Security & Privacy

- **Row Level Security (RLS)**: Enforced directly inside PostgreSQL. Public visitors may submit telemetry and feedback, but cannot read or modify other users' data or administrative logs.
- **Client Sanitization**: All user-provided inputs and feedback comments are strictly escaped and sanitized via [`src/utils/security.js`](./src/utils/security.js) to guard against cross-site scripting (XSS).
- **Strict Content Security Policy (CSP)**: `index.html` enforces explicit origins for fonts, scripts, workers, and network endpoints.

---

## 🤝 Contributing

Contributions, bug reports, and suggestions are warmly welcomed!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ for speedcubers and problem solvers worldwide.</sub>
</div>
