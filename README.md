# SRE-FE

Modern SaaS frontend for organization management — authentication, org management, and member role control.

> Open-source project built with React 19, TypeScript, and TanStack libraries.

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | React 19 + TypeScript (strict) |
| Bundler | Vite |
| Routing | TanStack Router |
| Server State | TanStack React Query |
| Forms | TanStack React Form |
| Tables | TanStack React Table |
| Styling | Tailwind CSS v4 |
| Components | Shadcn UI |
| HTTP | Axios |
| Toasts | Sonner |
| Icons | Lucide React |
| Errors | Sentry |

---

## Project Structure

```
src/
├── api/              # Axios client + endpoint modules + page-level query/mutation hooks
├── components/
│   └── ui/           # Shadcn UI primitives
├── contexts/         # AuthContext
├── layouts/          # RootLayout, AuthLayout, AppLayout
├── pages/            # auth/, org/, user/ pages
├── router.tsx        # TanStack Router config + route guards
├── types/            # Shared TypeScript types
├── utils/            # Shared utility functions
└── main.tsx          # App entry point
```

---

## Routes

| Path | Page | Guard |
|---|---|---|
| `/` | redirect | → `/orgs` if authed, → `/login` if not |
| `/login` | LoginPage | → `/orgs` if already authed |
| `/register` | RegisterPage | → `/orgs` if already authed |
| `/profile` | ProfilePage | → `/login` if not authed |
| `/orgs` | OrgListPage | → `/login` if not authed |
| `/orgs/$orgId/members` | OrgMembersPage | → `/login` if not authed |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/your-org/sre-fe.git
cd sre-fe
npm install
```

### Environment

Copy the example env file and configure your API base URL:

```bash
cp .env.example .env
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Auth

- JWT-based: access token stored in memory, refresh token in `localStorage`
- Axios interceptor silently refreshes on 401
- `AuthContext` runs a silent refresh on mount

---

## API

All API calls go through `src/api/client.ts` (Axios instance). Default base URL: `http://localhost:8080/api/v1`.

Each domain has its own module:
- `src/api/auth.ts` — login, register, refresh
- `src/api/orgs.ts` — org CRUD
- `src/api/users.ts` — user profile

Page-level data fetching is handled by dedicated hook files (e.g., `src/api/useOrgMembers.ts`).

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes
4. Open a pull request

---

## License

MIT
