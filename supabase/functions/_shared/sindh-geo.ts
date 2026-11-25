import { SINDH_BOUNDARY_GEOJSON } from "./sindh-boundary-data.ts";

export type GeoErrorCode =
  | "ELIGIBLE_SINDH"
  | "LOCATION_REQUIRED"
  | "INVALID_COORDINATES"
  | "OUTSIDE_SINDH"
  | "UNSUPPORTED_SERVICE_AREA"
  | "LOCATION_VERIFICATION_UNAVAILABLE";

export interface GeoValidationOutcome {
  eligible: boolean;
  code: GeoErrorCode;
  status: number;
  error?: string;
  karachiMetroCovered?: boolean;
}

type Position = readonly number[];
type LinearRing = readonly Position[];

const EPSILON = 1e-9;

const KARACHI_METRO_BOUNDS = {
  minLat: 24.70,
  maxLat: 25.65,
  minLon: 66.65,
  maxLon: 67.62,
};

const KARACHI_ONLY_DEPARTMENTS = new Set(["kmc", "kwsc", "kelectric"]);

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

function isInsideFeatureCollection(lat: number, lon: number): boolean {
  const features = SINDH_BOUNDARY_GEOJSON?.features;
  if (!Array.isArray(features) || features.length === 0) {
    throw new Error("LOCATION_VERIFICATION_UNAVAILABLE");
  }
  for (const feature of features) {
    const geom = feature?.geometry as
      | { type: "Polygon"; coordinates: readonly LinearRing[] }
      | { type: "MultiPolygon"; coordinates: readonly (readonly LinearRing[])[] }
      | undefined;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      if (pointInPolygonRings(lon, lat, geom.coordinates)) return true;
    } else if (geom.type === "MultiPolygon") {
      if (geom.coordinates.some((poly) => pointInPolygonRings(lon, lat, poly))) return true;
    }
  }
  return false;
}

export function validateSindhCoordinatesServer(
  latitude: unknown,
  longitude: unknown,
): GeoValidationOutcome {
  if (
    latitude === undefined ||
    latitude === null ||
    latitude === "" ||
    longitude === undefined ||
    longitude === null ||
    longitude === ""
  ) {
    return {
      eligible: false,
      code: "LOCATION_REQUIRED",
      status: 400,
      error: "Please select or detect an incident location within Sindh before submitting.",
    };
  }

  const lat = typeof latitude === "number" ? latitude : Number(latitude);
  const lon = typeof longitude === "number" ? longitude : Number(longitude);

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
      code: "INVALID_COORDINATES",
      status: 400,
      error: "The supplied incident coordinates are invalid.",
    };
  }

  if (lat > 55 && lon < 40) {
    return {
      eligible: false,
      code: "INVALID_COORDINATES",
      status: 400,
      error: "Incident latitude and longitude appear swapped.",
    };
  }

  try {
    if (!isInsideFeatureCollection(lat, lon)) {
      return {
        eligible: false,
        code: "OUTSIDE_SINDH",
        status: 422,
        error: "Outside our service region: Awaaz-e-Awam currently accepts complaints for locations within Sindh only.",
      };
    }

    const karachiMetroCovered =
      lat >= KARACHI_METRO_BOUNDS.minLat &&
      lat <= KARACHI_METRO_BOUNDS.maxLat &&
      lon >= KARACHI_METRO_BOUNDS.minLon &&
      lon <= KARACHI_METRO_BOUNDS.maxLon;

    return {
      eligible: true,
      code: "ELIGIBLE_SINDH",
      status: 200,
      karachiMetroCovered,
    };
  } catch {
    return {
      eligible: false,
      code: "LOCATION_VERIFICATION_UNAVAILABLE",
      status: 503,
      error: "Geographical boundary verification is temporarily unavailable.",
    };
  }
}

export function validateDepartmentCoverageServer(
  latitude: number,
  longitude: number,
  departments: readonly string[],
): GeoValidationOutcome {
  const sindhCheck = validateSindhCoordinatesServer(latitude, longitude);
  if (!sindhCheck.eligible) return sindhCheck;
  if (!departments.length || sindhCheck.karachiMetroCovered) {
    return sindhCheck;
  }
  const allKarachiOnly = departments.every((dept) => KARACHI_ONLY_DEPARTMENTS.has(dept));
  if (allKarachiOnly) {
    return {
      eligible: false,
      code: "UNSUPPORTED_SERVICE_AREA",
      status: 422,
      error: "This location is inside Sindh, but the matched municipal service is limited to Karachi coverage.",
      karachiMetroCovered: false,
    };
  }
  return sindhCheck;
}
