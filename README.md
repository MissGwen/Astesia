# Astesia

A cross-platform desktop database management tool built with **Tauri 2 + React 19 + TypeScript**.

## Features

- **Multi-database support** — MySQL, PostgreSQL, SQLite, SQL Server, MongoDB, Redis
- **SQL query editor** — Monaco Editor with syntax highlighting
- **Data browsing & editing** — Virtual-scrolling data grid with inline CRUD
- **Schema explorer** — Lazy-loading sidebar tree (databases → schemas → tables → columns)
- **Table structure** — View columns, indexes, constraints, and foreign keys
- **Database objects** — Browse views, functions, procedures, and triggers
- **ER diagrams** — Auto-layout entity relationship visualization (React Flow + Dagre)
- **Performance dashboards** — Database-specific metrics with Recharts
- **Data charts** — Visualize query results as charts
- **Backup & restore** — Background tasks with real-time progress tracking
- **Cross-connection table copy** — Copy tables between different connections
- **Redis key browser** — Dedicated key-value viewer
- **MongoDB document viewer** — Collection-based document browsing
- **i18n** — Simplified Chinese (default) and English
- **Theming** — Light / Dark / System

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | [Tauri 2](https://v2.tauri.app/) (Rust backend) |
| Frontend | React 19 + TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| UI primitives | Radix UI (shadcn-ui style) |
| State management | Zustand v5 |
| Editor | Monaco Editor |
| Charts | Recharts |
| ER diagrams | React Flow + Dagre |
| i18n | i18next + react-i18next |
| Virtual scroll | @tanstack/react-virtual |
| Package manager | pnpm |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (for the Tauri backend)
- Platform-specific Tauri prerequisites — see [Tauri docs](https://v2.tauri.app/start/prerequisites/)

### Development

```bash
pnpm install          # Install frontend dependencies
pnpm tauri:dev        # Start development (Vite HMR + Tauri window)
```

### Build

```bash
pnpm tauri:build      # Production build (creates platform installer)
```

### Other Commands

```bash
pnpm dev              # Frontend only (no Tauri window)
pnpm build            # TypeScript check + Vite build (frontend only)
pnpm lint             # ESLint
cd src-tauri && cargo build   # Rust backend only
```

## Project Structure

```
src/                        # React frontend
  components/               # Feature components (one folder per feature)
    ui/                     # Reusable Radix-based UI primitives
    Sidebar/                # Database explorer tree
    QueryEditor/            # Monaco SQL editor
    DataViewers/            # DataGrid, RedisViewer, MongoViewer
    ERDiagram/              # Entity relationship diagrams
    PerformanceDashboard/   # DB-specific performance metrics
    ...
  stores/                   # Zustand stores (one file per domain)
  types/                    # TypeScript type definitions
  hooks/                    # Custom React hooks
  i18n/                     # Translation files (zh-CN, en-US)
  lib/                      # Utilities (cn(), Monaco setup)

src-tauri/                  # Rust backend
  src/
    commands/               # Tauri IPC command handlers
    db/                     # Database driver implementations
    tasks/                  # Background task system
    state.rs                # AppState (connections, task manager)
    lib.rs                  # Plugin & command registration
```

