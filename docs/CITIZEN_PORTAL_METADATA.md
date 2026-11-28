# Citizen portal metadata and release gates

- Staging and all staff builds default to noindex. Set VITE_PUBLIC_SITE_URL to the actual HTTPS citizen origin and VITE_ENABLE_INDEXING=true **only** for the approved public citizen deployment.
- Vite generates route-specific HTML heads for six informational pages, a citizen-specific install manifest, robots.txt, sitemap.xml (only when enabled), and Cloudflare Pages _headers. Existing logo/favicon assets remain untouched.
- Private routes and tracking IDs never enter the sitemap or social metadata. Auth/RLS remain mandatory: robots directives are not access control.
- If choosing Vercel, configure equivalent X-Robots-Tag headers before enabling indexing; _headers is a Cloudflare Pages convention.
- Verify all three builds, direct HTML at public paths, noindex response headers at private paths, favicon/social preview image dimensions, canonical URLs and Search Console ownership. Do not claim official government affiliation or guaranteed indexing.
- Existing management/fieldwork route isolation needs separate verification; this change does not alter the route tree or authentication.
