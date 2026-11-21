import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import model from "./v11_model.json" with { type: "json" };
import {
  classifyV11RelationAware,
  assessComplaintDraft,
  resolveComplaintClarification,
  checkHazard,
  type V11ModelArtifact,
  type ClarificationAnswer,
  type DepartmentId,
  type V11RelationAwareResult,
  type UnderstandingResult,
} from "../_shared/v11-engine.ts";
import { processComplaintPrivacy } from "./privacy-engine.ts";

const classifier = model as unknown as V11ModelArtifact;
// A 200-word complaint does not justify unbounded request bodies. This also
// caps optional clarification answers and all other caller-controlled fields.
const MAX_REQUEST_BYTES = 16 * 1024;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RateLimitBucket {
  count: number;
  resetTime: number;
}
const ipBuckets = new Map<string, RateLimitBucket>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_GUEST_REQUESTS_PER_WINDOW = 30;

function checkGuestRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetTime) {
    ipBuckets.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_GUEST_REQUESTS_PER_WINDOW) {
    return false;
  }
  bucket.count++;
  return true;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function generateClaimCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let str = "";
  for (let i = 0; i < 12; i++) {
    str += chars[bytes[i] % chars.length];
  }
  return `CLM-${str.slice(0, 4)}-${str.slice(4, 8)}-${str.slice(8, 12)}`;
}

function generateGuestTrackingNumber(): { raw: string; formatted: string } {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  let digits = "";
  for (let i = 0; i < bytes.length && digits.length < 24; i++) {
    if (bytes[i] < 250) {
      digits += (bytes[i] % 10).toString();
    }
  }
  while (digits.length < 24) {
    const extra = new Uint8Array(16);
    crypto.getRandomValues(extra);
    for (let i = 0; i < extra.length && digits.length < 24; i++) {
      if (extra[i] < 250) {
        digits += (extra[i] % 10).toString();
      }
    }
  }
  const formatted = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12, 16)} ${digits.slice(16, 20)} ${digits.slice(20, 24)}`;
  return { raw: digits, formatted };
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function parseBoundedJson(req: Request): Promise<{ input?: unknown; tooLarge?: boolean; invalid?: boolean }> {
  const declaredLength = req.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > MAX_REQUEST_BYTES) return { tooLarge: true };
  if (!req.body) return { invalid: true };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return { tooLarge: true };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { input: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { invalid: true };
  } finally {
    reader.releaseLock();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Check optional authenticated user session
    let citizenId: string | null = null;
    const authorization = req.headers.get("Authorization");
    const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (authorization !== null && !token) return json({ error: "Invalid authentication.", code: "INVALID_SESSION" }, 401);
    if (token && token !== Deno.env.get("SUPABASE_ANON_KEY")) {
      const { data: identity, error: identityError } = await admin.auth.getUser(token);
      if (identityError || !identity?.user) return json({ error: "Please sign in again.", code: "INVALID_SESSION" }, 401);
      const { data: profile, error: profileError } = await admin.from("profiles")
        .select("role").eq("id", identity.user.id).maybeSingle();
      if (profileError || profile?.role !== "citizen") {
        return json({ error: "A citizen account is required to submit a complaint.", code: "CITIZEN_ACCOUNT_REQUIRED" }, 403);
      }
      citizenId = identity.user.id;
    }

    // Rate limit public unauthenticated (guest) submissions by client IP
    if (!citizenId) {
      const clientIp = req.headers.get("cf-connecting-ip")
        || req.headers.get("x-real-ip")
        || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || "unknown-client";
      if (!checkGuestRateLimit(clientIp)) {
        return new Response(JSON.stringify({
          error: "Too many complaint submissions. Please wait a moment before trying again.",
          code: "RATE_LIMITED",
        }), {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        });
      }
    }

    const parsed = await parseBoundedJson(req);
    if (parsed.tooLarge) {
      return json({ error: "Complaint request is too large.", code: "PAYLOAD_TOO_LARGE" }, 413);
    }
    if (parsed.invalid || !parsed.input || typeof parsed.input !== "object" || Array.isArray(parsed.input)) {
      return json({ error: "Invalid complaint payload.", code: "INVALID_COMPLAINT_PAYLOAD" }, 400);
    }

    // Bot / spam honeypot rejection
    const rawInput = parsed.input as Record<string, unknown>;
    if (
      ("website" in rawInput && Boolean(rawInput.website)) ||
      ("hp_bot_field" in rawInput && Boolean(rawInput.hp_bot_field))
    ) {
      return json({ error: "Automated submission rejected.", code: "BOT_DETECTED" }, 400);
    }
    const input = parsed.input as {
      description: string;
      incidentDistrict: string;
      incidentLocality: string;
      incidentPublicLocation: string;
      citizenName: string;
      citizenPhone: string;
      citizenEmail?: string;
      residentialAddress: string;
      clarificationAnswer?: ClarificationAnswer;
    };
    if (!input || typeof input.description !== "string") {
      return json({ error: "Invalid complaint payload.", code: "INVALID_COMPLAINT_PAYLOAD" }, 400);
    }
    const requiredTextFields = [
      input.incidentDistrict, input.incidentLocality, input.incidentPublicLocation,
      input.citizenName, input.citizenPhone, input.residentialAddress,
    ];
    const words = input.description.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 200 || input.description.length > 6000 ||
      requiredTextFields.some((value) => typeof value !== "string" || !value.trim() || value.length > 240) ||
      (input.citizenEmail !== undefined && (typeof input.citizenEmail !== "string" || input.citizenEmail.length > 254))) {
      return json({ error: "Please complete all required complaint fields (200 words max).", code: "INVALID_COMPLAINT_PAYLOAD" }, 400);
    }

    // Generate cryptographic private claim code and 24-digit tracking number for guest submissions
    let claimCode: string | undefined;
    let claimCodeHash: string | null = null;
    let guestTrackingNumber: string | undefined;
    let guestTrackingHash: string | null = null;
    if (!citizenId) {
      claimCode = generateClaimCode();
      claimCodeHash = await sha256Hex(claimCode);

      const tracking = generateGuestTrackingNumber();
      guestTrackingNumber = tracking.formatted;
      guestTrackingHash = await sha256Hex(tracking.raw);
    }

    // Server-Side Authoritative V11 Classification & Clarification
    let understanding: UnderstandingResult;
    if (input.clarificationAnswer) {
      understanding = resolveComplaintClarification(
        input.description,
        input.clarificationAnswer as ClarificationAnswer,
        classifier
      );
    } else {
      understanding = assessComplaintDraft(input.description, classifier);
    }

    if (understanding.state === "invalid") {
      return json({
        error: understanding.reason === "WORD_LIMIT"
          ? "Complaint must contain 200 words or fewer."
          : "Complaint description cannot be empty.",
        code: "INVALID_COMPLAINT_PAYLOAD",
      }, 400);
    }

    let prediction: V11RelationAwareResult;
    let needsReview = false;
    let reviewReason: string | null = null;
    let departments: DepartmentId[] = [];

    if (understanding.state === "ready") {
      prediction = understanding.prediction;
      departments = [...understanding.departments];
      needsReview = prediction.needsReview;
      reviewReason = prediction.reviewReason ?? null;
    } else if (understanding.state === "ask") {
      // Citizen submitted without answering clarification
      prediction = understanding.prediction;
      departments = [...prediction.departments];
      needsReview = true;
      reviewReason = "UNRESOLVED_AMBIGUITY";
    } else {
      // understanding.state === 'review'
      prediction = understanding.prediction;
      departments = [...prediction.departments];
      needsReview = true;
      reviewReason = understanding.reason ?? prediction.reviewReason ?? "REQUIRES_ADMIN_REVIEW";
    }

    if (departments.length === 0) {
      needsReview = true;
      if (!reviewReason) {
        reviewReason = "NO_DEPARTMENT_MET_THRESHOLD";
      }
    }

    const primaryDept = departments[0] ?? null;
    const probValues = Object.values(prediction.probabilities || {});
    const maxProb = probValues.length > 0 ? Math.max(...probValues) : 0;
    const isMultiLabel = departments.length > 1;
    const hasHazard = checkHazard(input.description);

    const issues = departments.map((dept, idx) => ({
      id: `iss-${dept}-${idx + 1}`,
      departmentId: dept,
      confidence: prediction.probabilities[dept] ?? 0,
      status: needsReview ? "under_review" : "assigned",
    }));

    const privacy = processComplaintPrivacy(input.description, {
      citizenName: input.citizenName,
      citizenPhone: input.citizenPhone,
      citizenEmail: input.citizenEmail,
      residentialAddress: input.residentialAddress,
      incidentDistrict: input.incidentDistrict,
      incidentLocality: input.incidentLocality,
      incidentPublicLocation: input.incidentPublicLocation,
      departmentId: primaryDept,
    });

    // Hold a privacy-uncertain case before department assignment. A nonempty
    // safe placeholder also prevents the historical RPC fallback to raw text.
    const privacyHold = privacy.flags.uncertainRedaction || !privacy.sanitizedDescription.trim();
    if (privacyHold) {
      needsReview = true;
      reviewReason = "PRIVACY_REVIEW_REQUIRED";
      for (const issue of issues) issue.status = "under_review";
    }
    const safeDescription = privacyHold ? "Complaint pending privacy review." : privacy.sanitizedDescription;
    const safeHeading = privacyHold ? "Complaint pending privacy review" : privacy.generatedHeading;
    const safeSummary = privacyHold ? safeDescription : privacy.factualSummary;

    // Embed rich multi-department routing metadata into redaction_flags
    const multiDepartmentMetadata = {
      is_multilabel: isMultiLabel,
      departments,
      has_hazard: hasHazard,
      issues,
      review_reason: reviewReason,
      model_version: prediction.modelVersion,
      decision_policy: prediction.decisionPolicy,
      notes: prediction.notes,
      clarification_state: understanding.state,
      clarification_answered: Boolean(input.clarificationAnswer),
    };

    const combinedRedactionFlags = {
      ...(privacy.flags || {}),
      multi_department_routing: multiDepartmentMetadata,
    };

    const { data, error } = await admin.rpc("submit_citizen_complaint", {
      p_citizen_id: citizenId,
      p_title: safeHeading,
      p_description: input.description, // Raw description stored in private table only
      p_sanitized_description: safeDescription,
      p_generated_heading: safeHeading,
      p_factual_summary: safeSummary,
      p_redaction_flags: combinedRedactionFlags,
      p_redaction_needs_review: privacy.flags.uncertainRedaction || privacy.flags.safetyHazard || needsReview,
      p_incident_district: input.incidentDistrict,
      p_incident_locality: input.incidentLocality,
      p_incident_public_location: input.incidentPublicLocation,
      p_citizen_name: input.citizenName,
      p_citizen_phone: input.citizenPhone,
      p_citizen_email: input.citizenEmail ?? "",
      p_residential_address: input.residentialAddress,
      p_predicted_department_id: primaryDept,
      p_prediction_confidence: maxProb,
      p_needs_review: needsReview,
      // Public callers must never decide whether a persisted civic case is
      // hidden as a demonstration record.
      p_is_demonstration: false,
      p_claim_code_hash: claimCodeHash,
      p_guest_tracking_hash: guestTrackingHash,
    });
    if (error) {
      console.error("Complaint submission RPC failed", error);
      return json({ error: "Submission service is temporarily unavailable.", code: "SUBMISSION_UNAVAILABLE" }, 500);
    }
    return json({
      ...data,
      prediction: {
        departmentId: primaryDept,
        departments,
        confidence: maxProb,
        probabilities: prediction.probabilities,
        isMultiLabel,
        hasHazard,
        needsReview,
        reviewReason,
        issues,
        modelVersion: prediction.modelVersion,
        decisionPolicy: prediction.decisionPolicy,
        clarificationState: understanding.state,
      },
      privacy: {
        heading: safeHeading,
        summary: safeSummary,
        sanitizedDescription: safeDescription,
        flags: privacy.flags,
      },
      claim_code: claimCode,
      guest_tracking_number: guestTrackingNumber,
    });
  } catch (error) {
    console.error("Unexpected complaint submission failure", error);
    return json({ error: "Submission service is temporarily unavailable.", code: "SUBMISSION_UNAVAILABLE" }, 500);
  }
});
