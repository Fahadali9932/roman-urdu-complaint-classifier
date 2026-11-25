# Sindh Geographical Boundary Dataset Provenance

- **Canonical Dataset**: `geoBoundaries PAK ADM1 Simplified (2019)` — Province feature `Sindh` (`shapeISO: PK-SD`, `shapeID: 70912109B8393927546319`)
- **Authoritative Source URL**: `https://www.geoboundaries.org/api/current/gbOpen/PAK/ADM1/` (`geoBoundaries-PAK-ADM1_simplified.geojson`)
- **License**: Public Domain (`https://creativecommons.org/share-your-work/public-domain/`)
- **Financial Cost**: `$0.00` (static local GeoJSON, zero external geocoding or SaaS APIs)
- **Raw PAK ADM1 Source SHA-256**: Checked at extraction time on 2026-11-25 (`geoBoundaries-PAK-ADM1_simplified.geojson`)
- **Extracted Local Artifact**:
  - Frontend: [sindhBoundary.json](file:///D:/RomanUrdu_V13_19_Review/src/data/geo/sindhBoundary.json)
  - Edge Functions: [sindh-boundary.json](file:///D:/RomanUrdu_V13_19_Review/supabase/functions/_shared/sindh-boundary.json)
  - Artifact Byte Size: `17,090` bytes
  - Artifact SHA-256: `e2653ec7189eb025193d91a575387c88b42a136b97cdfd14946e54d1d649c341`
- **Geometry Coordinate System**: RFC 7946 GeoJSON `[longitude, latitude]` (WGS84 / EPSG:4326), supporting `Polygon` and `MultiPolygon` with exterior rings, interior holes, and exact boundary-edge / vertex inclusion (`1e-9` epsilon).
- **Eligibility vs Service Coverage Separation**:
  1. **Sindh Geographical Eligibility**: Enforced against `sindhBoundary.json` prior to classification, persistence, or file upload (`LOCATION_REQUIRED`, `INVALID_COORDINATES`, `OUTSIDE_SINDH`, `LOCATION_VERIFICATION_UNAVAILABLE`).
  2. **Per-Department Service Coverage**: Evaluated independently after department routing (`kmc`, `kwsc`, `kelectric` scoped to Karachi Metropolitan bounds `24.72..25.65, 66.65..67.60`; provincial utilities `ssgc`, `sbca`, `sswmb` across Sindh -> returns `UNSUPPORTED_SERVICE_AREA` if all matched departments cover Karachi only while the eligible Sindh point is outside Karachi).
