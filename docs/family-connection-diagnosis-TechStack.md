# Tech Stack Document
## Family Connection Diagnosis™ Web Application

**Product name:** Family Connection Diagnosis™
**Client:** Ibironke O. Semowo — Mindful Parenting Educator
**Built by:** TechieKraft
**Version:** 1.0
**Date:** June 2026
**Companion documents:** PRD v1.0 · AppFlow v1.0

---

## How to read this document

This document locks every dependency, tool, and configuration decision for the project. No version should be changed without updating this document and testing the impact. Every decision includes a rationale so future you — or Claude Code — understands why it was made.

---

## 1. Recommendations summary

| Decision | Choice | Reason |
|---|---|---|
| Next.js version | **14.2.x** | Fully mature App Router, production-stable, strongest Claude Code training coverage |
| TypeScript mode | **Strict** | Clear data shapes throughout (scores, ranges, respondents, broadcasts) — strict catches the bugs that matter |
| Tailwind version | **v3.4.x** | Battle-tested, zero breaking change risk, best Next.js 14 compatibility |
| Email templates | **React Email** | Component-based, locally previewable, natively supported by Resend |
| Linting | **ESLint + Prettier** | Enforces consistent output across all Claude Code sessions |
| Package manager | **npm** | Consistent with project choice, generates `package-lock.json` |

---

## 2. Runtime and language

| Tool | Version | Notes |
|---|---|---|
| Node.js | `20.x LTS` | Use Node 20 (Iron LTS). Do not use Node 21 or 22 — not yet LTS. Verify with `node -v` before starting. |
| TypeScript | `5.4.x` | Installed via Next.js. Do not install separately. |
| npm | `10.x` | Ships with Node 20. Verify with `npm -v`. |

### TypeScript configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Strict mode enables:**
- `strictNullChecks` — no implicit null/undefined
- `noImplicitAny` — all variables must be typed
- `strictFunctionTypes` — prevents unsafe function assignments
- `strictPropertyInitialization` — class properties must be initialised

---

## 3. Framework

| Package | Version | Install |
|---|---|---|
| `next` | `14.2.15` | Included in scaffold |
| `react` | `18.3.1` | Included in scaffold |
| `react-dom` | `18.3.1` | Included in scaffold |

### Scaffold command

```bash
npx create-next-app@14.2.15 family-connection-diagnosis \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

### Next.js configuration (`next.config.ts`)

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
```

> Remote pattern allows logo images stored in Supabase Storage to be served via `next/image`.

---

## 4. Styling

| Package | Version | Install |
|---|---|---|
| `tailwindcss` | `3.4.14` | Included in scaffold |
| `postcss` | `8.4.47` | Included in scaffold |
| `autoprefixer` | `10.4.20` | Included in scaffold |

### Tailwind configuration (`tailwind.config.ts`)

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#1A1A1A',
          gold: '#F0C040',
          white: '#FFFFFF',
          offwhite: '#F5F0E8',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

> Brand colours are defined as Tailwind tokens. Use `bg-brand-black`, `text-brand-gold` etc. throughout the app. Never hardcode hex values in components.

---

## 5. Database and authentication

| Package | Version | Install |
|---|---|---|
| `@supabase/supabase-js` | `2.45.4` | `npm install @supabase/supabase-js@2.45.4` |
| `@supabase/ssr` | `0.5.1` | `npm install @supabase/ssr@0.5.1` |

> `@supabase/ssr` is required for Next.js App Router. It handles cookie-based auth correctly for server components and middleware. Do **not** use the older `@supabase/auth-helpers-nextjs` — it is deprecated.

### Supabase client setup

**`src/lib/supabase/client.ts`** — for use in client components
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`src/lib/supabase/server.ts`** — for use in server components and API routes
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**`src/middleware.ts`** — protects all `/admin` routes
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

---

## 6. Email sending

| Package | Version | Install |
|---|---|---|
| `resend` | `4.0.1` | `npm install resend@4.0.1` |
| `@react-email/components` | `0.0.25` | `npm install @react-email/components@0.0.25` |
| `react-email` | `3.0.1` | `npm install react-email@3.0.1 --save-dev` |

> `react-email` is a dev dependency only — it provides the local preview server (`email dev`). The `@react-email/components` and `resend` packages are runtime dependencies.

### Resend client setup

**`src/lib/resend.ts`**
```ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)
```

### Local email preview

Add to `package.json` scripts:
```json
"email": "email dev --dir src/emails --port 3001"
```

Run with `npm run email` to preview all email templates at `http://localhost:3001` without sending real emails.

---

## 7. Rich text editor

| Package | Version | Install |
|---|---|---|
| `@tiptap/react` | `2.8.0` | `npm install @tiptap/react@2.8.0` |
| `@tiptap/pm` | `2.8.0` | `npm install @tiptap/pm@2.8.0` |
| `@tiptap/starter-kit` | `2.8.0` | `npm install @tiptap/starter-kit@2.8.0` |
| `@tiptap/extension-link` | `2.8.0` | `npm install @tiptap/extension-link@2.8.0` |
| `@tiptap/extension-placeholder` | `2.8.0` | `npm install @tiptap/extension-placeholder@2.8.0` |

> All Tiptap packages must be on the **same version**. Version mismatch causes silent runtime errors. If upgrading, upgrade all together.

### Tiptap extensions in use

| Extension | Purpose |
|---|---|
| `StarterKit` | Bold, italic, underline, bullet list, numbered list, paragraphs, headings |
| `Link` | Hyperlinks in broadcast body |
| `Placeholder` | *"Write your message here…"* placeholder text |

---

## 8. Scheduling

Broadcast scheduling is handled by **Vercel Cron Jobs** — no additional npm package required.

### Cron configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/send-broadcasts",
      "schedule": "* * * * *"
    }
  ]
}
```

> Runs every minute. The API route queries Supabase for broadcasts where `status = 'scheduled'` and `scheduled_at <= now()`, fires them via Resend, and updates status to `sent`.

### Cron security

The cron route must verify the request is from Vercel, not a public caller:

**`src/app/api/cron/send-broadcasts/route.ts`**
```ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorised', { status: 401 })
  }
  // ... broadcast logic
}
```

Add `CRON_SECRET` to environment variables (see Section 12).

---

## 9. Form handling and validation

| Package | Version | Install |
|---|---|---|
| `react-hook-form` | `7.53.1` | `npm install react-hook-form@7.53.1` |
| `zod` | `3.23.8` | `npm install zod@3.23.8` |
| `@hookform/resolvers` | `3.9.1` | `npm install @hookform/resolvers@3.9.1` |

> `react-hook-form` handles all form state. `zod` defines validation schemas shared between client and server (API routes). `@hookform/resolvers` connects the two.

### Usage pattern

Define schema once in `src/lib/schemas/`:
```ts
// src/lib/schemas/gate.ts
import { z } from 'zod'

export const gateSchema = z.object({
  firstName: z.string().min(1, 'Please enter your first name'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
})

export type GateFormData = z.infer<typeof gateSchema>
```

Use the same schema in both the form component (client validation) and the API route (server validation).

---

## 10. Utility libraries

| Package | Version | Install | Purpose |
|---|---|---|---|
| `date-fns` | `3.6.0` | `npm install date-fns@3.6.0` | Date formatting throughout admin (submission dates, scheduled times) |
| `clsx` | `2.1.1` | `npm install clsx@2.1.1` | Conditional class merging in components |
| `tailwind-merge` | `2.5.4` | `npm install tailwind-merge@2.5.4` | Resolves Tailwind class conflicts when merging |

### `cn` utility (standard pattern)

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

> Use `cn()` everywhere classes are conditionally applied. This is the standard shadcn/ui pattern and is widely understood by Claude Code.

---

## 11. Linting and formatting

| Package | Version | Install |
|---|---|---|
| `eslint` | `8.57.1` | Included in scaffold |
| `eslint-config-next` | `14.2.15` | Included in scaffold |
| `prettier` | `3.3.3` | `npm install prettier@3.3.3 --save-dev` |
| `eslint-config-prettier` | `9.1.0` | `npm install eslint-config-prettier@9.1.0 --save-dev` |
| `eslint-plugin-prettier` | `5.2.1` | `npm install eslint-plugin-prettier@5.2.1 --save-dev` |

### ESLint configuration (`.eslintrc.json`)

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:prettier/recommended"
  ],
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

### Prettier configuration (`.prettierrc`)

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": []
}
```

### `.prettierignore`

```
.next
node_modules
public
*.md
```

### npm scripts (add to `package.json`)

```json
"lint": "next lint",
"lint:fix": "next lint --fix",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

---

## 12. Environment variables

All environment variables are stored in `.env.local` for local development and in Vercel's environment variable dashboard for production. The `.env.local` file is **never committed to version control**.

### `.env.local` (complete)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend
RESEND_API_KEY=re_your_resend_api_key

# Cron security
CRON_SECRET=a-long-random-secret-string

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Variable reference

| Variable | Scope | Used in | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Client + server Supabase clients | Safe to expose — Supabase RLS protects data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client + server Supabase clients | Safe to expose — limited permissions by design |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | API routes that need to bypass RLS (e.g. cron job) | **Never expose to client. Never prefix with NEXT_PUBLIC_** |
| `RESEND_API_KEY` | Server only | `/api/submit`, `/api/broadcasts/send`, cron route | Never expose to client |
| `CRON_SECRET` | Server only | `/api/cron/send-broadcasts` | Verifies requests are from Vercel Cron |
| `NEXT_PUBLIC_APP_URL` | Public | Generating absolute URLs (e.g. in emails) | Set to production URL on Vercel |

### `.env.example` (commit this file)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=

# Cron security
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

---

## 13. Hosting and deployment

| Service | Purpose | Tier |
|---|---|---|
| Vercel | App hosting + Cron jobs | Free (Hobby) — sufficient for this project |
| Supabase | Database + Auth + Storage | Free tier — sufficient for early stage |
| Resend | Transactional + broadcast email | Free tier (3,000 emails/month) — upgrade when needed |

### Vercel configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/send-broadcasts",
      "schedule": "* * * * *"
    }
  ]
}
```

### Deployment steps

1. Push repository to GitHub
2. Connect GitHub repo to Vercel
3. Add all environment variables in Vercel dashboard (Settings → Environment Variables)
4. Add CNAME record in domain registrar: `quiz` → `cname.vercel-dns.com`
5. Add `quiz.ibironkeosemowo.com` as a custom domain in Vercel
6. Add DNS records in domain registrar for Resend email verification (provided by Resend)
7. Verify domain in Resend dashboard
8. Deploy

---

## 14. Complete `package.json`

```json
{
  "name": "family-connection-diagnosis",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "email": "email dev --dir src/emails --port 3001"
  },
  "dependencies": {
    "@hookform/resolvers": "3.9.1",
    "@react-email/components": "0.0.25",
    "@supabase/ssr": "0.5.1",
    "@supabase/supabase-js": "2.45.4",
    "@tiptap/extension-link": "2.8.0",
    "@tiptap/extension-placeholder": "2.8.0",
    "@tiptap/pm": "2.8.0",
    "@tiptap/react": "2.8.0",
    "@tiptap/starter-kit": "2.8.0",
    "clsx": "2.1.1",
    "date-fns": "3.6.0",
    "next": "14.2.15",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-hook-form": "7.53.1",
    "resend": "4.0.1",
    "tailwind-merge": "2.5.4",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@types/node": "20.16.11",
    "@types/react": "18.3.11",
    "@types/react-dom": "18.3.1",
    "autoprefixer": "10.4.20",
    "eslint": "8.57.1",
    "eslint-config-next": "14.2.15",
    "eslint-config-prettier": "9.1.0",
    "eslint-plugin-prettier": "5.2.1",
    "postcss": "8.4.47",
    "prettier": "3.3.3",
    "react-email": "3.0.1",
    "tailwindcss": "3.4.14",
    "typescript": "5.4.5"
  }
}
```

---

## 15. Full install command (after scaffold)

After running the scaffold command in Section 3, install all additional dependencies in one command:

```bash
npm install \
  @supabase/supabase-js@2.45.4 \
  @supabase/ssr@0.5.1 \
  resend@4.0.1 \
  @react-email/components@0.0.25 \
  @tiptap/react@2.8.0 \
  @tiptap/pm@2.8.0 \
  @tiptap/starter-kit@2.8.0 \
  @tiptap/extension-link@2.8.0 \
  @tiptap/extension-placeholder@2.8.0 \
  react-hook-form@7.53.1 \
  zod@3.23.8 \
  @hookform/resolvers@3.9.1 \
  date-fns@3.6.0 \
  clsx@2.1.1 \
  tailwind-merge@2.5.4

npm install --save-dev \
  prettier@3.3.3 \
  eslint-config-prettier@9.1.0 \
  eslint-plugin-prettier@5.2.1 \
  react-email@3.0.1
```

---

## 16. Version upgrade policy

| Package | Upgrade approach |
|---|---|
| `next` | Only upgrade on a new major project milestone. Test thoroughly — App Router behaviour can change between minor versions. |
| `@supabase/*` | Both packages must be upgraded together. Check Supabase changelog before upgrading. |
| `@tiptap/*` | All Tiptap packages must be upgraded together to the same version. Never upgrade one without the others. |
| `resend` | Safe to upgrade minor versions. Check changelog for breaking changes on major bumps. |
| `tailwindcss` | Do not upgrade from v3 to v4 mid-project. Treat as a full migration if ever needed. |
| All others | Minor version upgrades are generally safe. Run `npm run build` and `npm run lint` after any upgrade. |

---

## 17. What is deliberately excluded

| Tool | Reason excluded |
|---|---|
| shadcn/ui | Adds complexity and opinion. Tailwind utility classes are sufficient for this project's UI needs. |
| Prisma / Drizzle | Supabase JS client handles all database operations. No ORM needed. |
| Redux / Zustand | No complex global state. React state and URL params are sufficient. |
| Jest / Vitest | Out of scope for v1. Can be added later. |
| Storybook | Out of scope for v1. |
| Docker | Not needed — Vercel handles deployment, Supabase handles database. |
| Stripe | Out of scope per PRD. |
| next-auth | Supabase Auth handles all authentication. No need for a second auth layer. |
