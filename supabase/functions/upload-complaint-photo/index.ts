import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_FILE = 1024 * 1024;
const MAX_BODY = MAX_FILE + 8192;
const BUCKET = "complaint-evidence-private";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (message: string, status: number) => new Response(JSON.stringify({ error: message }), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

async function boundedBody(req: Request): Promise<Uint8Array | null> {
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY || !req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

async function hash(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

function acceptedFile(bytes: Uint8Array, mime: string): boolean {
  if (!bytes.length || bytes.length > MAX_FILE) return false;
  if (mime === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.length > 8 && [137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b);
  if (mime === "image/webp") return bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0,4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply("Method not allowed.", 405);
  try {
    const bytes = await boundedBody(req);
    if (!bytes) return reply("Photo must be 1 MB or smaller.", 413);
    const form = await new Request("http://localhost", {
      method: "POST", headers: { "content-type": req.headers.get("content-type") || "" }, body: bytes,
    }).formData();
    const reference = form.get("reference");
    const tracking = form.get("tracking");
    const file = form.get("photo");
    if (typeof reference !== "string" || !/^[A-Z0-9-]{5,50}$/.test(reference) || !(file instanceof File)) {
      return reply("Invalid photo submission.", 400);
    }
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    if (!acceptedFile(fileBytes, file.type)) return reply("Use a JPEG, PNG, or WebP photo up to 1 MB.", 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: complaint, error } = await admin.from("complaints")
      .select("id,citizen_id,guest_tracking_hash").eq("reference_number", reference).maybeSingle();
    if (error) return reply("Photo service unavailable.", 503);
    if (!complaint) return reply("Photo could not be attached.", 403);

    let authorized = false;
    const normalized = typeof tracking === "string" ? tracking.replace(/\s+/g, "") : "";
    if (/^\d{24}$/.test(normalized) && complaint.guest_tracking_hash) {
      authorized = await hash(normalized) === complaint.guest_tracking_hash;
    }
    if (!authorized) {
      const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
      if (bearer && bearer !== Deno.env.get("SUPABASE_ANON_KEY")) {
        const { data: identity, error: identityError } = await admin.auth.getUser(bearer);
        authorized = !identityError && Boolean(identity.user && identity.user.id === complaint.citizen_id);
      }
    }
    if (!authorized) return reply("Photo could not be attached.", 403);

    const { data: existing, error: existingError } = await admin.from("complaint_evidence")
      .select("complaint_id").eq("complaint_id", complaint.id).maybeSingle();
    if (existingError) return reply("Photo service unavailable.", 503);
    if (existing) return reply("A photo is already attached to this complaint.", 409);

    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
    const path = `${complaint.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage.from(BUCKET)
      .upload(path, fileBytes, { contentType: file.type, upsert: false, cacheControl: "3600" });
    if (uploadError) return reply("Photo service unavailable.", 503);
    const { error: ledgerError } = await admin.from("complaint_evidence").insert({
      complaint_id: complaint.id, storage_path: path, mime_type: file.type, bytes: fileBytes.length,
    });
    if (ledgerError) {
      await admin.storage.from(BUCKET).remove([path]);
      return reply("Photo could not be attached.", 409);
    }
    return new Response(JSON.stringify({ attached: true }), {
      status: 201, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch {
    return reply("Photo service unavailable.", 503);
  }
});
