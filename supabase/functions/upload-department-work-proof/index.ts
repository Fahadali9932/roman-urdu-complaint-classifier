import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const LIMIT = 1024 * 1024;
const MAX_BODY = LIMIT + 8192;
const BUCKET = "department-work-proof-private";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const response = (error: string, status: number) =>
  new Response(JSON.stringify({ error }), { status, headers });

async function readBounded(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY || !request.body) return null;
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BODY) { await reader.cancel(); return null; }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function isSupportedImage(raw: Uint8Array, mime: string) {
  if (!raw.length || raw.length > LIMIT) return false;
  if (mime === "image/jpeg") return raw.length > 3 && raw[0] === 255 && raw[1] === 216 && raw[2] === 255;
  if (mime === "image/png") return raw.length > 8 && [137,80,78,71,13,10,26,10].every((v, i) => raw[i] === v);
  return mime === "image/webp" && raw.length > 12 &&
    String.fromCharCode(...raw.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...raw.slice(8, 12)) === "WEBP";
}

function validJwtAssurance(jwt: string) {
  try {
    const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(part));
    // The token is independently verified through auth.getUser before use.
    return claims.aal === "aal2";
  } catch { return false; }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response("Method not allowed.", 405);
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer) return response("A verified staff session is required.", 401);

  try {
    const raw = await readBounded(request);
    if (!raw) return response("Evidence photo must be at most 1 MB.", 413);
    const form = await new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": request.headers.get("content-type") || "" },
      body: raw,
    }).formData();
    const orderId = form.get("orderId");
    const photo = form.get("photo");
    const latitude = Number(form.get("latitude"));
    const longitude = Number(form.get("longitude"));
    const accuracy = Number(form.get("accuracy"));

    if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId) ||
      !(photo instanceof File) || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      !Number.isFinite(accuracy) || latitude < 24.45 || latitude > 25.65 ||
      longitude < 66.25 || longitude > 67.85 || accuracy <= 0 || accuracy > 500) {
      return response("A work order, current Karachi GPS location and photo are required.", 400);
    }
    const photoBytes = new Uint8Array(await photo.arrayBuffer());
    if (!isSupportedImage(photoBytes, photo.type)) {
      return response("Choose a JPEG, PNG, or WebP photograph no larger than 1 MB.", 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !secret) return response("Evidence service is not configured.", 503);
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: identityError } = await admin.auth.getUser(bearer);
    if (identityError || !identity.user || !validJwtAssurance(bearer)) {
      return response("Staff authentication with a second factor is required.", 401);
    }
    const officerId = identity.user.id;
    const { data: order, error: orderError } = await admin.from("department_work_orders")
      .select("id,department_id,officer_id,status").eq("id", orderId).maybeSingle();
    if (orderError) return response("Evidence service is unavailable.", 503);
    if (!order || order.officer_id !== officerId || order.status !== "in_progress") {
      return response("This work order is not assigned to you or is not ready for proof.", 403);
    }
    const { data: membership, error: membershipError } = await admin.from("department_memberships")
      .select("id").eq("user_id", officerId).eq("department_id", order.department_id)
      .eq("staff_role", "officer").eq("status", "active").maybeSingle();
    if (membershipError || !membership) return response("Officer membership is inactive.", 403);

    const digest = await crypto.subtle.digest("SHA-256", photoBytes);
    const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const extension = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp";
    const path = `work/${order.department_id}/${orderId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, photoBytes, {
      contentType: photo.type, cacheControl: "300", upsert: false,
    });
    if (uploadError) return response("Could not securely upload the photograph.", 503);
    const { data: proofId, error: saveError } = await admin.rpc("v1318_record_proof", {
      p_order: orderId, p_officer: officerId, p_path: path, p_mime: photo.type,
      p_bytes: photoBytes.length, p_sha256: sha256,
      p_lat: latitude, p_lon: longitude, p_accuracy: accuracy,
    });
    if (saveError) {
      await admin.storage.from(BUCKET).remove([path]);
      return response("Evidence was not recorded. Please try again.", 409);
    }
    return new Response(JSON.stringify({ submitted: true, proofId }), { status: 201, headers });
  } catch {
    return response("Evidence could not be submitted. Please try again.", 503);
  }
});
