/**
 * V16 advisory duplicate matching. A match is never proof of the same incident.
 * The Head must explicitly decide whether to link or create separate work.
 * Coordinates are citizen-confirmed incident pins, not staff/device positions.
 */
export const INCIDENT_MATCH_RADIUS_METRES = 30;

export interface IncidentPin {
  latitude: number | string | null;
  longitude: number | string | null;
}
export interface IncidentIdentity {
  complaintId: string;
  departmentId: string;
  issueTypes: readonly string[];
  pin: IncidentPin | null;
}
export interface ActiveIncident extends IncidentIdentity {
  orderId: string;
  status: string;
}

function coordinate(value: number | string | null, max: number): number | null {
  if (value === null || (typeof value === 'string' && !value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}

export function incidentDistanceMetres(a: IncidentPin | null, b: IncidentPin | null): number | null {
  if (!a || !b) return null;
  const lat1 = coordinate(a.latitude, 90);
  const lon1 = coordinate(a.longitude, 180);
  const lat2 = coordinate(b.latitude, 90);
  const lon2 = coordinate(b.longitude, 180);
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const rad = Math.PI / 180;
  const h = Math.sin((lat2 - lat1) * rad / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lon2 - lon1) * rad / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

const unknownTypes = new Set(['general', 'unknown', 'other', 'uncategorized', 'unclassified', 'unspecified']);
function knownIssueTypes(types: readonly string[]): string[] {
  return [...new Set(types.map(t => t.trim().toLowerCase()).filter(t => t && !unknownTypes.has(t)))].sort();
}

/** Compare the entire department-specific issue set; avoid linking mixed issues on a partial match. */
export function findPotentialIncidentMatches<T extends ActiveIncident>(
  incoming: IncidentIdentity,
  activeOrders: readonly T[],
): Array<{ incident: T; distanceMetres: number }> {
  const sourceTypes = knownIssueTypes(incoming.issueTypes);
  if (!sourceTypes.length || sourceTypes.length !== new Set(incoming.issueTypes.map(t => t.trim().toLowerCase())).size) return [];
  return activeOrders.flatMap(incident => {
    if (!['assigned', 'in_progress', 'returned', 'pending_review'].includes(incident.status) ||
      incident.departmentId !== incoming.departmentId ||
      incident.complaintId === incoming.complaintId) return [];
    const targetTypes = knownIssueTypes(incident.issueTypes);
    if (targetTypes.length !== new Set(incident.issueTypes.map(t => t.trim().toLowerCase())).size ||
      targetTypes.length !== sourceTypes.length ||
      !sourceTypes.every((t, i) => t === targetTypes[i])) return [];
    const distanceMetres = incidentDistanceMetres(incoming.pin, incident.pin);
    return distanceMetres !== null && distanceMetres <= INCIDENT_MATCH_RADIUS_METRES
      ? [{ incident, distanceMetres }]
      : [];
  }).sort((a, b) => a.distanceMetres - b.distanceMetres || a.incident.orderId.localeCompare(b.incident.orderId));
}
