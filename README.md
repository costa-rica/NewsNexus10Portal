# News Nexus 10 Portal

## Overview

NewsNexus10Portal is the web interface for the NewsNexus10Db and microservices suite of applications.
NewsNexus10Portal is a updated version of NewsNexusPortal09 - and complete modernization of the previous NewsNexus08Portal web app.
While v08 was built with plain JavaScript, minimal styling, and without Next.js conventions, v09 rebuilds the Portal from the ground up using Next.js (App Router), TailwindCSS, and TypeScript, ensuring long-term scalability, maintainability, and alignment with modern React best practices.

This version starts from a clean npx create-next-app@latest base and adopts the architectural patterns and UI structure of the open-source free-nextjs-admin-dashboard-main project. That template provides a well-organized file system, reusable components, and responsive dashboard layouts — features that will serve as the foundation for implementing all existing NewsNexus08Portal content, workflows, and user interfaces in a structured, convention-driven way.

The goal of NewsNexus10Portal is to faithfully re-create and enhance the functionality of the previous Portal within a modern Next.js environment, ultimately serving as the main front end for interacting with NewsNexusAPI09 and the broader News Nexus 09 microservice suite.

### Overview TL;DR

- started from `npx create-next-app@latest`
  - No Turbopack -> this causes problems with the svg icons (src/icons)
- Heavily lifting the architecture from [free-nextjs-admin-dashboard-main](https://tailadmin.com/download)
- Customizeing it to fit the needs of the NewsNexus Portal.
- Uses App Router
- Uses TailwindCSS
- Uses Redux for state management
- Uses TypeScript

## Project Structure

```
.
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── images
│   │   ├── buttons
│   │   ├── deleteCircleX.svg
│   │   ├── kmLogo_square1500.png
│   │   ├── logoAndNameRound.png
│   │   ├── logoWhiteBackground.png
│   │   ├── menu
│   │   └── new.png
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── src
│   ├── app
│   │   ├── (dashboard)
│   │   ├── (full-width)
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── components
│   │   ├── auth
│   │   ├── common
│   │   ├── form
│   │   ├── header
│   │   └── ui
│   ├── context
│   │   ├── SidebarContext.tsx
│   │   └── ThemeContext.tsx
│   ├── icons
│   │   └── contains all .svg icons
│   ├── layout
│   │   ├── AppHeader.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── Backdrop.tsx
│   │   └── SidebarWidget.tsx
│   ├── store
│   │   ├── features
│   │   ├── hooks.ts
│   │   └── index.ts
│   └── svg.d.ts
└── tsconfig.json
```

## .env

```
NEXT_PUBLIC_API_BASE_URL=https://api.news-nexus.kineticmetrics.com
NEXT_PUBLIC_API_BASE_URL_DEV=https://api.news-nexus-dev.kineticmetrics.com
NEXT_PUBLIC_API_BASE_URL_WORKSTATION=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NewsNexus
NEXT_PUBLIC_MODE=dev
```

## Key differences from version 08

- **Layout vs `TemplateView.js`**: In v08 (Pages Router) we used a `TemplateView.js` component to render the top/side navigation across pages. In v09 (App Router), this responsibility moves to `layout.tsx`.
  - Use `src/app/(dashboard)/layout.tsx` to wrap all dashboard routes with the sidebar/header chrome (this replaces `TemplateView.js`).
  - Optionally use `src/app/(full-width)/layout.tsx` for auth and other pages that should not include the dashboard chrome.
- **Route groups don’t affect URLs**: `(dashboard)` and `(full-width)` are organizational; they scope layouts and don’t appear in the path.
- **Per‑segment routing**: Routes are defined by folders with a `page.tsx`. Shared UI (including what lived in `components/common/`) belongs under `src/components/`.
- **No `[root_navigator].js` / `[navigator].js`**: Navigation is file‑system based; those dynamic navigator files are no longer needed.

## Template Changes

This version of the News Nexus Portal will heavily leverage the [free-nextjs-admin-dashboard-main](https://tailadmin.com/download) project. The following is a list of modification we I am making from the template.

- SignUpForm.tsx changed to RegistrationForm.tsx
- SignInForm.tsx changed to LoginForm.tsx

## Imports

### Required for Template

- `npm install tailwind-merge`
- `npm i -D @svgr/webpack`
