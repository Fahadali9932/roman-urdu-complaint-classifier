import { SINDH_BOUNDARY_GEOJSON } from '../../data/geo/sindhBoundaryData';
import type { DepartmentId } from '../../types';

export type GeoEligibilityCode =
  | 'ELIGIBLE_SINDH'
  | 'LOCATION_REQUIRED'
  | 'INVALID_COORDINATES'
  | 'OUTSIDE_SINDH'
  | 'UNSUPPORTED_SERVICE_AREA'
  | 'LOCATION_VERIFICATION_UNAVAILABLE';

export interface GeoEligibilityResult {
  eligible: boolean;
  code: GeoEligibilityCode;
  message: string;
  messageUrdu: string;
  karachiMetroCovered?: boolean;
}

type Position = readonly [number, number] | readonly number[];
type LinearRing = readonly Position[];

const EPSILON = 1e-9;

// Karachi metropolitan municipal service coverage zone (distinct from provincial Sindh polygon).
// Departments scoped strictly to Karachi Metro ('kmc', 'kwsc', 'kelectric') use this boundary
// to separate Sindh eligibility from municipal service delivery coverage.
const KARACHI_METRO_BOUNDS = {
  minLat: 24.70,
  maxLat: 25.65,
  minLon: 66.65,
  maxLon: 67.62,
};

const KARACHI_ONLY_DEPARTMENTS = new Set<DepartmentId>(['kmc', 'kwsc', 'kelectric']);

function pointOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  const cross = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
  const segLen = Math.hypot(x2 - x1, y2 - y1);
  if (Math.abs(cross) > EPSILON * Math.max(1, segLen)) {
    return false;
  }
  const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
  return dot <= EPSILON;
}

function pointInRing(lon: number, lat: number, ring: LinearRing): { inside: boolean; onEdge: boolean } {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (pointOnSegment(lon, lat, xi, yi, xj, yj)) {
      return { inside: true, onEdge: true };
    }
    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return { inside, onEdge: false };
}

function pointInPolygonRings(lon: number, lat: number, rings: readonly LinearRing[]): boolean {
  if (!rings.length) return false;
  const outer = pointInRing(lon, lat, rings[0]);
  if (!outer.inside) return false;
  for (let holeIndex = 1; holeIndex < rings.length; holeIndex++) {
    const hole = pointInRing(lon, lat, rings[holeIndex]);
    if (hole.inside && !hole.onEdge) {
      return false;
    }
  }
  return true;
}

export function isPointInGeoJsonFeatureCollection(
  lat: number,
  lon: number,
  featureCollection: typeof SINDH_BOUNDARY_GEOJSON,
): boolean {
  if (!featureCollection?.features?.length) {
    throw new Error('LOCATION_VERIFICATION_UNAVAILABLE');
  }
  for (const feature of featureCollection.features) {
    const geom = feature?.geometry as
      | { type: 'Polygon'; coordinates: readonly LinearRing[] }
      | { type: 'MultiPolygon'; coordinates: readonly (readonly LinearRing[])[] }
      | undefined;
    if (!geom) continue;
    if (geom.type === 'Polygon') {
      if (pointInPolygonRings(lon, lat, geom.coordinates)) return true;
    } else if (geom.type === 'MultiPolygon') {
      if (geom.coordinates.some((poly) => pointInPolygonRings(lon, lat, poly))) return true;
    }
  }
  return false;
}

/**
 * Validates raw coordinate inputs against RFC 7946 Sindh boundary GeoJSON.
 * Never trusts client flags or skips boundary edge / NaN / swapped-axis guards.
 */
export function verifySindhLocation(
  latitude: unknown,
  longitude: unknown,
): GeoEligibilityResult {
  if (
    latitude === undefined ||
    latitude === null ||
    latitude === '' ||
    longitude === undefined ||
    longitude === null ||
    longitude === ''
  ) {
    return {
      eligible: false,
      code: 'LOCATION_REQUIRED',
      message: 'Please select or detect an incident location within Sindh before submitting.',
      messageUrdu: 'شکایت جمع کرانے سے پہلے براہِ کرم سندھ کے اندر واقعے کا مقام منتخب کریں۔',
    };
  }

  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lon = typeof longitude === 'number' ? longitude : Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return {
      eligible: false,
      code: 'INVALID_COORDINATES',
      message: 'The selected coordinates are invalid. Enter or pick valid latitude and longitude values.',
      messageUrdu: 'منتخب کردہ جغرافیائی نقاط درست نہیں ہیں۔ براہِ کرم درست طول بلد اور عرض بلد منتخب کریں۔',
    };
  }

  // Catch swapped Pakistan lat/lon pairs explicitly (e.g. lat ~67, lon ~24)
  if (lat > 55 && lon < 40) {
    return {
      eligible: false,
      code: 'INVALID_COORDINATES',
      message: 'Coordinates appear reversed (latitude and longitude swapped). Pick a valid point within Sindh.',
      messageUrdu: 'طول بلد اور عرض بلد الٹ درج کیے گئے ہیں۔ براہِ کرم سندھ کے اندر درست مقام منتخب کریں۔',
    };
  }

  try {
    const insideSindh = isPointInGeoJsonFeatureCollection(lat, lon, SINDH_BOUNDARY_GEOJSON);
    if (!insideSindh) {
      return {
        eligible: false,
        code: 'OUTSIDE_SINDH',
        message: 'Outside our service region: Awaaz-e-Awam currently accepts complaints for locations within Sindh only. Please select an eligible incident location.',
        messageUrdu: 'ہماری سروس کے دائرہ کار سے باہر: آوازِ عوام فی الحال صرف سندھ کے اندر واقع مقامات کی شکایات قبول کرتا ہے۔ براہِ کرم درست مقام منتخب کریں۔',
      };
    }

    const karachiMetroCovered =
      lat >= KARACHI_METRO_BOUNDS.minLat &&
      lat <= KARACHI_METRO_BOUNDS.maxLat &&
      lon >= KARACHI_METRO_BOUNDS.minLon &&
      lon <= KARACHI_METRO_BOUNDS.maxLon;

    return {
      eligible: true,
      code: 'ELIGIBLE_SINDH',
      message: 'Incident location verified inside Sindh.',
      messageUrdu: 'واقعے کا مقام سندھ کے اندر تصدیق شدہ ہے۔',
      karachiMetroCovered,
    };
  } catch {
    return {
      eligible: false,
      code: 'LOCATION_VERIFICATION_UNAVAILABLE',
      message: 'Location eligibility verification is temporarily unavailable.',
      messageUrdu: 'مقام کی تصدیق کی سروس عارضی طور پر دستیاب نہیں ہے۔',
    };
  }
}

/**
 * Separates Sindh geographical eligibility from per-department service coverage.
 * If an eligible Sindh location outside Karachi matches solely Karachi-only municipal desks,
 * surfaces UNSUPPORTED_SERVICE_AREA transparently without misreporting Sindh exclusion.
 */
export function evaluateDepartmentServiceCoverage(
  latitude: number,
  longitude: number,
  departments: readonly DepartmentId[],
): GeoEligibilityResult {
  const sindhCheck = verifySindhLocation(latitude, longitude);
  if (!sindhCheck.eligible) {
    return sindhCheck;
  }

  if (departments.length === 0 || sindhCheck.karachiMetroCovered) {
    return sindhCheck;
  }

  const allKarachiOnly = departments.every((dept) => KARACHI_ONLY_DEPARTMENTS.has(dept));
  if (allKarachiOnly) {
    return {
      eligible: false,
      code: 'UNSUPPORTED_SERVICE_AREA',
      message:
        'Your location is inside Sindh, but the matched municipal authority (KMC / KW&SC / K-Electric) currently services complaints within Karachi metropolitan bounds only.',
      messageUrdu:
        'آپ کا مقام سندھ کے اندر ہے، لیکن متعلقہ بلدیاتی ادارہ فی الحال صرف کراچی کے دائرہ کار میں خدمات فراہم کرتا ہے۔',
      karachiMetroCovered: false,
    };
  }

  return sindhCheck;
}
