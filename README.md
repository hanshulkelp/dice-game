# DiceGame 🎲

An online multiplayer dice game built as an **Nx monorepo** with an **Angular 18** frontend, **NestJS 10** backend, **PostgreSQL 16** database, **Redis 7** for caching, and **Socket.IO** for real-time gameplay.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Run Tasks](#run-tasks)
- [Useful Links](#useful-links)

---

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Frontend     | Angular 18, SCSS, RxJS              |
| Backend      | NestJS 10, TypeORM, Socket.IO       |
| Database     | PostgreSQL 16                       |
| Cache        | Redis 7                             |
| Monorepo     | Nx 19.8                             |
| Language     | TypeScript 5.5                      |
| Testing      | Jest                                |
| Linting      | ESLint, Prettier                    |
| Bundler      | Webpack (API), Angular CLI (Web)    |
| Containers   | Docker Compose                      |

---

## Project Structure

```
dice-game/
├── .editorconfig                        # Editor formatting rules
├── .gitignore                           # Git ignore rules
├── .prettierrc                          # Prettier configuration
├── .prettierignore                      # Prettier ignore rules
├── docker-compose.yml                   # Docker services (PostgreSQL 16 + Redis 7)
├── eslint.config.js                     # Root ESLint configuration
├── jest.config.ts                       # Root Jest configuration
├── jest.preset.js                       # Jest preset (shared across projects)
├── nx.json                              # Nx workspace configuration & plugin settings
├── package.json                         # Root dependencies & workspace metadata
├── package-lock.json                    # Locked dependency versions
├── tsconfig.base.json                   # Base TypeScript config (shared paths & options)
├── README.md                            # This file
│
├── apps/
│   ├── api/
│   │   ├── api/                                    # ── NestJS Backend Application ──
│   │   │   ├── .env                                # Environment variables (DATABASE_URL, etc.)
│   │   │   ├── eslint.config.js                    # API-specific ESLint config
│   │   │   ├── jest.config.ts                       # API unit test config
│   │   │   ├── project.json                        # Nx project config (targets, tags)
│   │   │   ├── tsconfig.json                       # API TypeScript config (references)
│   │   │   ├── tsconfig.app.json                   # TS config for application build
│   │   │   ├── tsconfig.spec.json                  # TS config for test files
│   │   │   ├── webpack.config.js                   # Webpack bundler config for NestJS
│   │   │   │
│   │   │   └── src/
│   │   │       ├── main.ts                         # App bootstrap (dotenv, global prefix /api, port 3000)
│   │   │       │
│   │   │       ├── app/
│   │   │       │   ├── app.module.ts               # Root module (ConfigModule, TypeORM, feature modules)
│   │   │       │   ├── app.controller.ts           # Root health-check controller
│   │   │       │   ├── app.controller.spec.ts      # Controller tests
│   │   │       │   ├── app.service.ts              # Root service
│   │   │       │   └── app.service.spec.ts         # Service tests
│   │   │       │
│   │   │       ├── assets/                         # Static assets (empty)
│   │   │       │
│   │   │       ├── common/                         # ── Shared Backend Utilities ──
│   │   │       │   ├── decorators/                 # Custom decorators
│   │   │       │   ├── filters/                    # Exception filters
│   │   │       │   ├── guards/                     # Auth & role guards
│   │   │       │   └── interceptors/               # Request/response interceptors
│   │   │       │
│   │   │       ├── config/                         # ── Configuration Files ──
│   │   │       │   ├── database.config.ts          # TypeORM async config (PostgreSQL, User entity, migrations)
│   │   │       │   ├── jwt.config.ts               # JWT authentication config (placeholder)
│   │   │       │   └── redis.config.ts             # Redis connection config (placeholder)
│   │   │       │
│   │   │       ├── migrations/                     # TypeORM database migrations
│   │   │       │
│   │   │       └── modules/                        # ── Feature Modules ──
│   │   │           │
│   │   │           ├── auth/                       # Authentication module
│   │   │           │   ├── auth.module.ts           # Module definition
│   │   │           │   ├── auth.controller.ts      # Routes: GET /auth/status
│   │   │           │   ├── auth.service.ts         # Auth business logic
│   │   │           │   ├── dto/                    # Data transfer objects (login, register)
│   │   │           │   └── strategies/             # Passport strategies (JWT, local)
│   │   │           │
│   │   │           ├── game/                       # Game logic module
│   │   │           │   ├── game.module.ts          # Module definition
│   │   │           │   ├── game.controller.ts      # Routes: GET /game/status
│   │   │           │   ├── game.service.ts         # Dice game business logic
│   │   │           │   └── dto/                    # Game-related DTOs
│   │   │           │
│   │   │           ├── gateway/                    # Real-time WebSocket module
│   │   │           │   ├── gateway.module.ts       # Module definition
│   │   │           │   └── game.gateway.ts         # Socket.IO gateway for live game events
│   │   │           │
│   │   │           ├── leaderboard/                # Leaderboard module
│   │   │           │   ├── leaderboard.module.ts   # Module definition
│   │   │           │   ├── leaderboard.controller.ts # Routes: GET /leaderboard/status
│   │   │           │   └── leaderboard.service.ts  # Leaderboard ranking logic
│   │   │           │
│   │   │           └── users/                      # Users module
│   │   │               ├── user.entity.ts          # TypeORM entity (id, email, password_hash, game_username, avatar_url, stats)
│   │   │               ├── users.controller.ts     # Routes: GET /users/status
│   │   │               └── users.service.ts        # User CRUD logic
│   │   │
│   │   └── api-e2e/                                # ── API End-to-End Tests ──
│   │       ├── eslint.config.js                    # E2E ESLint config
│   │       ├── jest.config.ts                       # E2E Jest config
│   │       ├── project.json                        # Nx project config
│   │       ├── tsconfig.json                       # TS config
│   │       ├── tsconfig.spec.json                  # TS spec config
│   │       └── src/
│   │           ├── api-api/
│   │           │   └── api-api.spec.ts             # E2E test specs for API endpoints
│   │           └── support/
│   │               ├── global-setup.ts             # Jest global setup (start server)
│   │               ├── global-teardown.ts          # Jest global teardown (stop server)
│   │               └── test-setup.ts               # Per-test setup (Axios defaults)
│   │
│   └── web/                                        # ── Angular Frontend Application ──
│       ├── eslint.config.js                        # Web ESLint config
│       ├── jest.config.ts                           # Web unit test config
│       ├── project.json                            # Nx project config
│       ├── server.ts                               # Angular SSR server entry point
│       ├── tsconfig.json                           # Web TS config (references)
│       ├── tsconfig.app.json                       # TS config for app build
│       ├── tsconfig.editor.json                    # TS config for IDE support
│       ├── tsconfig.spec.json                      # TS config for tests
│       │
│       ├── public/
│       │   └── favicon.ico                         # Browser tab icon
│       │
│       └── src/
│           ├── index.html                          # HTML entry point
│           ├── main.ts                             # Client bootstrap
│           ├── main.server.ts                      # SSR bootstrap
│           ├── styles.scss                         # Global styles
│           ├── test-setup.ts                       # Test environment setup
│           │
│           └── app/
│               ├── app.component.ts                # Root component
│               ├── app.component.html              # Root template
│               ├── app.component.scss              # Root styles
│               ├── app.component.spec.ts           # Root component tests
│               ├── app.config.ts                   # App providers (router, zone)
│               ├── app.config.server.ts            # SSR-specific providers
│               ├── app.routes.ts                   # Route definitions
│               ├── nx-welcome.component.ts         # Nx welcome page (scaffold)
│               │
│               ├── core/                           # ── Core Services & Guards ──
│               │   ├── auth.service.ts             # Client-side auth service
│               │   ├── auth.service.spec.ts        # Auth service tests
│               │   ├── auth.guard.ts               # Route guard (canActivate)
│               │   ├── auth.guard.spec.ts          # Guard tests
│               │   ├── jwt.interceptor.ts          # HTTP interceptor for JWT tokens
│               │   └── jwt.interceptor.spec.ts     # Interceptor tests
│               │
│               ├── pages/                          # ── Page Components ──
│               │   ├── auth/
│               │   │   ├── login/login/            # Login page
│               │   │   │   ├── login.component.ts
│               │   │   │   ├── login.component.html
│               │   │   │   ├── login.component.css
│               │   │   │   └── login.component.spec.ts
│               │   │   └── signup/signup/          # Signup page
│               │   │       ├── signup.component.ts
│               │   │       ├── signup.component.html
│               │   │       ├── signup.component.css
│               │   │       └── signup.component.spec.ts
│               │   │
│               │   ├── game/game/                  # Game play page
│               │   │   ├── game.component.ts
│               │   │   ├── game.component.html
│               │   │   ├── game.component.css
│               │   │   └── game.component.spec.ts
│               │   │
│               │   ├── home/home/                  # Landing / home page
│               │   │   ├── home.component.ts
│               │   │   ├── home.component.html
│               │   │   ├── home.component.css
│               │   │   └── home.component.spec.ts
│               │   │
│               │   ├── lobby/lobby/                # Game lobby / matchmaking page
│               │   │   ├── lobby.component.ts
│               │   │   ├── lobby.component.html
│               │   │   ├── lobby.component.css
│               │   │   └── lobby.component.spec.ts
│               │   │
│               │   └── profile/profile/            # User profile page
│               │       ├── profile.component.ts
│               │       ├── profile.component.html
│               │       ├── profile.component.css
│               │       └── profile.component.spec.ts
│               │
│               └── shared/
│                   └── components/
│                       └── navbar/navbar/          # Navigation bar component
│                           ├── navbar.component.ts
│                           ├── navbar.component.html
│                           ├── navbar.component.css
│                           └── navbar.component.spec.ts
│
└── libs/
    └── shared-types/                               # ── Shared Library ──
        ├── eslint.config.js                        # Lib ESLint config
        ├── jest.config.ts                           # Lib test config
        ├── package.json                            # Lib package metadata
        ├── project.json                            # Nx project config
        ├── README.md                               # Lib documentation
        ├── tsconfig.json                           # Lib TS config (references)
        ├── tsconfig.lib.json                       # TS config for lib build
        ├── tsconfig.spec.json                      # TS config for tests
        └── src/
            ├── index.ts                            # Barrel export
            └── lib/
                ├── shared-types.ts                 # Shared interfaces & types (used by both API & Web)
                └── shared-types.spec.ts            # Type tests
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Nx Monorepo                        │
│                                                         │
│  ┌──────────────┐   WebSocket    ┌───────────────────┐  │
│  │   Angular    │ ◄────────────► │     NestJS        │  │
│  │   Frontend   │   HTTP / REST  │     Backend       │  │
│  │   (web)      │ ──────────────►│     (api)         │  │
│  └──────────────┘                └────────┬──────────┘  │
│         │                                 │             │
│         │          ┌──────────────┐       │             │
│         └─────────►│ shared-types │◄──────┘             │
│                    │    (lib)     │                      │
│                    └──────────────┘                      │
│                                          │              │
│                              ┌───────────┴───────────┐  │
│                              │                       │  │
│                         ┌────┴─────┐          ┌──────┴┐ │
│                         │PostgreSQL│          │ Redis │ │
│                         │  (5432)  │          │(6379) │ │
│                         └──────────┘          └───────┘ │
└─────────────────────────────────────────────────────────┘
```

### Key Directories Explained

| Directory                     | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `apps/api/api/`               | NestJS backend — REST API + WebSocket gateway                  |
| `apps/api/api/src/modules/`   | Feature modules (auth, game, gateway, leaderboard, users)      |
| `apps/api/api/src/config/`    | Configuration factories (database, JWT, Redis)                 |
| `apps/api/api/src/common/`    | Shared decorators, filters, guards, and interceptors           |
| `apps/api/api-e2e/`           | End-to-end tests for the API                                   |
| `apps/web/`                   | Angular frontend with SSR support                              |
| `apps/web/src/app/core/`      | Singleton services, guards, and interceptors                   |
| `apps/web/src/app/pages/`     | Routable page components (home, auth, game, lobby, profile)    |
| `apps/web/src/app/shared/`    | Reusable UI components (navbar, etc.)                          |
| `libs/shared-types/`          | Shared TypeScript types & interfaces consumed by API and Web   |

### Database Schema (User Entity)

| Column          | Type          | Constraints               |
| --------------- | ------------- | ------------------------- |
| `id`            | UUID          | Primary key, auto-generated |
| `email`         | VARCHAR       | Unique, not null          |
| `password_hash` | VARCHAR       | Not null                  |
| `game_username` | VARCHAR(50)   | Unique, not null          |
| `avatar_url`    | VARCHAR       | Nullable                  |
| `total_games`   | INT           | Default: 0                |
| `total_wins`    | INT           | Default: 0                |
| `created_at`    | TIMESTAMP     | Auto-generated            |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- **Docker** & **Docker Compose** (for PostgreSQL & Redis)

### Setup

```sh
# Clone the repo
git clone <repo-url> && cd dice-game

# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Start the API server (port 3000)
npx nx serve api

# Start the Angular dev server (port 4200)
npx nx serve web
```

---

## Run Tasks

```sh
# Serve the frontend
npx nx serve web

# Serve the backend
npx nx serve api

# Build for production
npx nx build web
npx nx build api

# Run unit tests
npx nx test web
npx nx test api

# Run e2e tests
npx nx e2e api-e2e

# Lint
npx nx lint web
npx nx lint api

# View project graph
npx nx graph

# See all targets for a project
npx nx show project web
npx nx show project api
```

---

## Useful Links

- [Nx Documentation](https://nx.dev)
- [Angular Docs](https://angular.dev)
- [NestJS Docs](https://docs.nestjs.com)
- [TypeORM Docs](https://typeorm.io)
- [Socket.IO Docs](https://socket.io/docs)
