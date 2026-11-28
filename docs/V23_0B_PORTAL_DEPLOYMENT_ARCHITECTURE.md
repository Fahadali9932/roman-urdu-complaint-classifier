# AWAAZ-E-AWAM (آوازِ عوام) — V23.0B INDEPENDENT PORTAL DEPLOYMENT ARCHITECTURE

## 1. MULTI-PORTAL DEPLOYMENT GOAL

The project owner requires three distinct public domain environments deployed from this single repository:
1. **Citizen Portal:** `awaaz-e-awam.pages.dev` (Public reporting, complaint tracking, and issues map)
2. **Department Head Console:** `aea-management.pages.dev` (Desktop-optimized administrative management, dispatch, and analytics)
3. **Field Officer Mobile Workspace:** `aea-fieldwork.pages.dev` (Mobile-optimized fieldwork execution, GPS verification, and proof submission)

---

## 2. ARCHITECTURAL EVALUATION: SPA VS MULTI-TARGET BUILDS

### Current Repository Condition
The application is currently structured as a monolithic Single Page Application (SPA) using React 18, Vite, and React Router.

### Comparison of Deployment Strategies

| Factor | Strategy A: Domain-Aware Single Build | Strategy B: Multi-Target Build (`VITE_PORTAL_TARGET`) |
| :--- | :--- | :--- |
| **Build Artifacts** | Single `dist/` directory deployed to all 3 domains | Three distinct `dist/` builds with dead-code tree-shaking |
| **CI/CD Complexity** | Low (1 build step in GitHub Actions / Cloudflare) | Medium (3 separate build commands) |
| **Security Isolation**| Client-side route guarding | Build-time bundle isolation (HOD code excluded from Citizen bundle) |
| **Bundle Size** | Full application (~280 KB gzipped) | Split bundles (~110 KB Citizen, ~140 KB Management, ~95 KB Fieldwork) |
| **Domain Routing** | Checks `window.location.hostname` | Dedicated entry points per domain |

**Architectural Recommendation:** Strategy B (Multi-Target Build) for maximum security and code isolation, with Strategy A supported as an immediate zero-configuration fallback.

---

## 3. MULTI-TARGET BUILD CONFIGURATION (STRATEGY B)

### 1. Build Environment Switch (`vite.config.ts`)
```ts
const portalTarget = process.env.VITE_PORTAL_TARGET || 'all';

export default defineConfig({
  define: {
    __PORTAL_TARGET__: JSON.stringify(portalTarget),
  },
  // ... plugins and settings
});
```

### 2. Cloudflare Pages Build Commands

- **Citizen Portal (`awaaz-e-awam.pages.dev`):**
  - Build command: `npm run build:citizen` (`cross-env VITE_PORTAL_TARGET=citizen vite build`)
  - Output directory: `dist`
- **Department Head Console (`aea-management.pages.dev`):**
  - Build command: `npm run build:management` (`cross-env VITE_PORTAL_TARGET=management vite build`)
  - Output directory: `dist`
- **Field Officer Console (`aea-fieldwork.pages.dev`):**
  - Build command: `npm run build:fieldwork` (`cross-env VITE_PORTAL_TARGET=fieldwork vite build`)
  - Output directory: `dist`

---

## 4. DOMAIN-AWARE DYNAMIC ROUTING CONFIGURATION (STRATEGY A)

When deploying a single build across all three domains, `src/routes/AppRoutes.tsx` resolves the initial landing route based on hostname:

```tsx
const getInitialPortalRoute = () => {
  const host = window.location.hostname.toLowerCase();
  if (host.includes('aea-management') || host.includes('management.')) {
    return '/department/head/login';
  }
  if (host.includes('aea-fieldwork') || host.includes('fieldwork.')) {
    return '/department/officer/login';
  }
  return '/'; // Citizen Portal default
};
```

---

## 5. CLOUDFLARE PAGES CONFIGURATION FILES

### 1. Security Headers (`public/_headers`)
```http
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(self), display-capture=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org;
```

### 2. Single Page Application Rewrites (`public/_redirects`)
```
/*    /index.html   200
```

### 3. Cross-Portal Cross-Origin Isolation
When an Officer attempts to open the management portal address or vice versa, the system triggers a domain redirect:
- Field Officer accessing `aea-management.pages.dev` -> redirected to `https://aea-fieldwork.pages.dev`.
- Citizen accessing `aea-management.pages.dev` -> redirected to `https://awaaz-e-awam.pages.dev`.
- HOD accessing `aea-fieldwork.pages.dev` -> redirected to `https://aea-management.pages.dev`.
