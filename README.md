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



├── apps/
│   ├── api/
│   │   ├── api/                                    # ── NestJS Backend Application ──
│   │      ├── .env                                # Environment variables (DATABASE_URL, etc.)
│   │      ├── eslint.config.js                    # API-specific ESLint config
│   │      ├── jest.config.ts                       # API unit test config
│   │      ├── project.json                        # Nx project config (targets, tags)
│   │      ├── tsconfig.json                       # API TypeScript config (references)
│   │      ├── tsconfig.app.json                   # TS config for application build
│   │      ├── tsconfig.spec.json                  # TS config for test files
│   │      ├── webpack.config.js                   # Webpack bundler config for NestJS
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
│   │   
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







