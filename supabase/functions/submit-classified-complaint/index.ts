import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import model from "./model.json" with { type: "json" };
import { processComplaintPrivacy } from "./privacy-engine.ts";

type Model = {
  classes: string[];
  vocabulary: Record<string, number>;
  idf: number[];
  coef: number[][];
  intercept: number[];
  ngram_range: [number, number];
  analyzer?: string;
  confidence_threshold?: number;
  margin_threshold?: number;
};
const classifier = model as Model;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function features(text: string): Map<number, number> {
  const counts = new Map<number, number>();
  if (classifier.analyzer === "word") {
    const words = text.toLowerCase().normalize("NFKC").match(/\b\w\w+\b/gu) ?? [];
    for (let i = 0; i < words.length; i++) {
      const col1 = classifier.vocabulary[words[i]];
      if (col1 !== undefined) counts.set(col1, (counts.get(col1) ?? 0) + 1);
      if (classifier.ngram_range[1] >= 2 && i < words.length - 1) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        const col2 = classifier.vocabulary[bigram];
        if (col2 !== undefined) counts.set(col2, (counts.get(col2) ?? 0) + 1);
      }
    }
  } else {
    const words = text.toLowerCase().normalize("NFKC").match(/[^\s]+/g) ?? [];
    for (const word of words) {
      const padded = ` ${word} `;
      for (let n = classifier.ngram_range[0]; n <= classifier.ngram_range[1]; n++) {
        for (let index = 0; index <= padded.length - n; index++) {
          const column = classifier.vocabulary[padded.slice(index, index + n)];
          if (column !== undefined) counts.set(column, (counts.get(column) ?? 0) + 1);
        }
      }
    }
  }
  let norm = 0;
  for (const [column, count] of counts) {
    const weighted = count * classifier.idf[column];
    counts.set(column, weighted);
    norm += weighted * weighted;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [column, weighted] of counts) counts.set(column, weighted / norm);
  return counts;
}

function classify(text: string) {
  const vector = features(text);
  const scores = classifier.classes.map((_, classIndex) => {
    let score = classifier.intercept[classIndex];
    for (const [column, value] of vector) score += classifier.coef[classIndex][column] * value;
    return score;
  });
  const ordered = scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score);
  const max = ordered[0].score;
  const probabilities = scores.map((score) => Math.exp(score - max));
  const total = probabilities.reduce((sum, value) => sum + value, 0);
  const confidence = probabilities[ordered[0].index] / total;
  const margin = ordered[0].score - ordered[1].score;
  const confThresh = classifier.confidence_threshold ?? 0.50;
  const margThresh = classifier.margin_threshold ?? 0.15;
  return {
    departmentId: classifier.classes[ordered[0].index],
    confidence,
    needsReview: confidence < confThresh || margin < margThresh,
  };
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
    if (authorization) {
      const token = authorization.replace(/^Bearer\s+/i, "");
      const { data: identity } = await admin.auth.getUser(token);
      if (identity?.user) {
        const { data: profile } = await admin
          .from("profiles")
          .select("role")
          .eq("id", identity.user.id)
          .maybeSingle();
        if (profile?.role === "citizen") {
          citizenId = identity.user.id;
        } else if (profile?.role === "department_staff") {
          return json({ error: "A citizen account is required to submit a complaint.", code: "CITIZEN_ACCOUNT_REQUIRED" }, 403);
        }
      }
    }

    const input = await req.json();
    if (!input || typeof input.description !== "string") {
      return json({ error: "Invalid complaint payload.", code: "INVALID_COMPLAINT_PAYLOAD" }, 400);
    }
    const requiredTextFields = [
      input.incidentDistrict, input.incidentLocality, input.incidentPublicLocation,
      input.citizenName, input.citizenPhone, input.residentialAddress,
    ];
    const words = input.description.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 200 || requiredTextFields.some((value) => typeof value !== "string" || !value.trim())) {
      return json({ error: "Please complete all required complaint fields.", code: "INVALID_COMPLAINT_PAYLOAD" }, 400);
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

    const result = classify(`${input.title ?? ""} ${input.description}`);
    const privacy = processComplaintPrivacy(input.description, {
      citizenName: input.citizenName,
      citizenPhone: input.citizenPhone,
      citizenEmail: input.citizenEmail,
      residentialAddress: input.residentialAddress,
      incidentDistrict: input.incidentDistrict,
      incidentLocality: input.incidentLocality,
      incidentPublicLocation: input.incidentPublicLocation,
      departmentId: result.departmentId,
    });

    const { data, error } = await admin.rpc("submit_citizen_complaint", {
      p_citizen_id: citizenId,
      p_title: input.title ?? "",
      p_description: input.description, // Raw description stored in private table only
      p_sanitized_description: privacy.sanitizedDescription, // Sanitized description stored in complaints
      p_generated_heading: privacy.generatedHeading,
      p_factual_summary: privacy.factualSummary,
      p_redaction_flags: privacy.flags,
      p_redaction_needs_review: privacy.flags.uncertainRedaction || privacy.flags.safetyHazard,
      p_incident_district: input.incidentDistrict,
      p_incident_locality: input.incidentLocality,
      p_incident_public_location: input.incidentPublicLocation,
      p_citizen_name: input.citizenName,
      p_citizen_phone: input.citizenPhone,
      p_citizen_email: input.citizenEmail ?? "",
      p_residential_address: input.residentialAddress,
      p_predicted_department_id: result.departmentId,
      p_prediction_confidence: result.confidence,
      p_needs_review: result.needsReview,
      p_is_demonstration: input.isDemonstration === true,
      p_claim_code_hash: claimCodeHash,
      p_guest_tracking_hash: guestTrackingHash,
    });
    if (error) {
      console.error("Complaint submission RPC failed", error);
      return json({ error: "Submission service is temporarily unavailable.", code: "SUBMISSION_UNAVAILABLE" }, 500);
    }
    return json({
      ...data,
      prediction: result,
      privacy: {
        heading: privacy.generatedHeading,
        summary: privacy.factualSummary,
        sanitizedDescription: privacy.sanitizedDescription,
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
