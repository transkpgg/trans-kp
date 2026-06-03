# Trans KP App

Aplikasi absensi karyawan berbasis PWA untuk perusahaan transportasi.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Custom Design System
- **Icons**: Lucide React
- **Charts**: Recharts
- **Animations**: Framer Motion + CSS Animations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm atau yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Login Demo

- **Email**: admin@transkp.com
- **Password**: (any password)

## Project Structure

```
src/
├── app/           # Next.js App Router pages
│   ├── (auth)/    # Login pages
│   ├── (dashboard)/ # User dashboard (karyawan)
│   └── (admin)/   # Admin dashboard
├── components/    # Reusable components
├── lib/           # Utilities, mock data, geofence
├── hooks/         # Custom React hooks
└── types/         # TypeScript types
```

## Features (V1)

- ✅ Login
- ✅ Absensi GPS + Geofencing (Haversine Formula)
- ✅ Kamera Selfie (front camera only)
- ✅ Anti-Fake GPS (5 level)
- ✅ Dashboard Admin (CRUD User, Monitoring)
- ✅ Laporan PDF/Excel
- ✅ Hotel Visit (Driver)
- ✅ PWA (Progressive Web App)
