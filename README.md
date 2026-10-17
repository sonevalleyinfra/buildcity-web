# BuildCity

Android apps (customer + partner), release steps and over-the-air updates: see [docs/android-release.md](docs/android-release.md).

## Server environment

Required variables for the API in `server/` (full list: `server/.env.example`).

| Name | Notes |
|------|-------|
| `APP_ENV` | Required. One of `production`, `staging`, `test`, `development`. `production`/`staging` also need the matching DB marker (`ALTER DATABASE <db> SET buildcity.env = '<env>'`); `test`/`development` need a localhost `DATABASE_URL`. The API refuses to boot otherwise. |
| `DATABASE_URL` | Postgres connection URL. |
| `JWT_SECRET` | Token signing secret. |

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
