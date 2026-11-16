import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import model from "./multilabel_model.json" with { type: "json" };
import { processComplaintPrivacy } from "./privacy-engine.ts";

type MultiLabelModel = {
  model_version: string;
  classes: string[];
  vocabulary: Record<string, number>;
  idf: number[];
  coef: number[][];
  intercept: number[];
  thresholds: Record<string, number>;
  auto_route_confidence_gate: number;
  ngram_range: [number, number];
  sublinear_tf: boolean;
  hazard_affirmative_patterns: string[];
  hazard_negation_patterns: string[];
};

const classifier = model as MultiLabelModel;
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

function normalizeRomanUrdu(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\bbijlee\b|\bbijlii\b|\bbijly\b|\bbatti\b/g, "bijli")
    .replace(/\bpaani\b|\bpany\b|\bpaney\b/g, "pani")
    .replace(/\bgadda\b|\bkhadday\b|\bcrater\b/g, "khadda")
    .replace(/\bsarak\b|\bsadq\b/g, "sadak")
    .replace(/\bgutar\b|\bgatar\b|\bgater\b/g, "gutter")
    .replace(/\bkoora\b|\bkura\b|\bkuchra\b/g, "kachra")
    .replace(/\bsooi\s+gas\b|\bsui\s+gas\b/g, "ssgc gas");
}

function features(text: string): Map<number, number> {
  const counts = new Map<number, number>();
  const normalized = normalizeRomanUrdu(text);
  const words = normalized.match(/\b\w\w+\b/gu) ?? [];
  for (let i = 0; i < words.length; i++) {
    const col1 = classifier.vocabulary[words[i]];
    if (col1 !== undefined) counts.set(col1, (counts.get(col1) ?? 0) + 1);
    if (classifier.ngram_range[1] >= 2 && i < words.length - 1) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      const col2 = classifier.vocabulary[bigram];
      if (col2 !== undefined) counts.set(col2, (counts.get(col2) ?? 0) + 1);
    }
  }
  let norm = 0;
  for (const [col, count] of counts) {
    const tf = classifier.sublinear_tf ? 1 + Math.log(count) : count;
    const weighted = tf * classifier.idf[col];
    counts.set(col, weighted);
    norm += weighted * weighted;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [col, weighted] of counts) counts.set(col, weighted / norm);
  return counts;
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function checkHazard(text: string): boolean {
  const low = text.toLowerCase();
  for (const neg of classifier.hazard_negation_patterns) {
    if (new RegExp(neg, "i").test(low)) return false;
  }
  for (const aff of classifier.hazard_affirmative_patterns) {
    if (new RegExp(aff, "i").test(low)) return true;
  }
  return false;
}

function classifyMultiLabel(text: string) {
  const vector = features(text);
  const probabilities: Record<string, number> = {};
  const selectedDepartments: string[] = [];

  for (let c = 0; c < classifier.classes.length; c++) {
    const dept = classifier.classes[c];
    let score = classifier.intercept[c];
    for (const [col, val] of vector) {
      score += classifier.coef[c][col] * val;
    }
    const prob = sigmoid(score);
    probabilities[dept] = prob;

    const threshold = classifier.thresholds[dept] ?? 0.50;
    if (prob >= threshold) {
      selectedDepartments.push(dept);
    }
  }

  // Sort selected by probability descending
  selectedDepartments.sort((a, b) => probabilities[b] - probabilities[a]);

  const maxProb = Math.max(...Object.values(probabilities));
  const autoRouteGate = classifier.auto_route_confidence_gate ?? 0.65;
  const isMultiLabel = selectedDepartments.length > 1;
  const hasHazard = checkHazard(text);

  let needsReview = false;
  let reviewReason = "";

  if (selectedDepartments.length === 0) {
    needsReview = true;
    reviewReason = "NO_DEPARTMENT_MET_THRESHOLD";
  } else if (maxProb < autoRouteGate) {
    needsReview = true;
    reviewReason = "CONFIDENCE_BELOW_AUTO_ROUTE_GATE";
  }

  const primaryDept = selectedDepartments[0] || "kmc";

  const issues = selectedDepartments.map((dept, idx) => ({
    id: `iss-${dept}-${idx + 1}`,
    departmentId: dept,
    confidence: probabilities[dept] ?? 0,
    status: "assigned" as const,
  }));

  return {
    departments: selectedDepartments,
    primaryDepartmentId: primaryDept,
    confidence: maxProb,
    probabilities,
    needsReview,
    reviewReason,
    isMultiLabel,
    hasHazard,
    issues,
    modelVersion: classifier.model_version,
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

    const result = classifyMultiLabel(`${input.title ?? ""} ${input.description}`);
    const privacy = processComplaintPrivacy(input.description, {
      citizenName: input.citizenName,
      citizenPhone: input.citizenPhone,
      citizenEmail: input.citizenEmail,
      residentialAddress: input.residentialAddress,
      incidentDistrict: input.incidentDistrict,
      incidentLocality: input.incidentLocality,
      incidentPublicLocation: input.incidentPublicLocation,
      departmentId: result.primaryDepartmentId,
    });

    // Embed rich multi-department routing metadata into redaction_flags
    const multiDepartmentMetadata = {
      is_multilabel: result.isMultiLabel,
      departments: result.departments,
      has_hazard: result.hasHazard,
      issues: result.issues,
      review_reason: result.reviewReason,
      model_version: result.modelVersion,
    };

    const combinedRedactionFlags = {
      ...(privacy.flags || {}),
      multi_department_routing: multiDepartmentMetadata,
    };

    const { data, error } = await admin.rpc("submit_citizen_complaint", {
      p_citizen_id: citizenId,
      p_title: input.title ?? "",
      p_description: input.description, // Raw description stored in private table only
      p_sanitized_description: privacy.sanitizedDescription, // Sanitized description stored in complaints
      p_generated_heading: privacy.generatedHeading,
      p_factual_summary: privacy.factualSummary,
      p_redaction_flags: combinedRedactionFlags,
      p_redaction_needs_review: privacy.flags.uncertainRedaction || privacy.flags.safetyHazard || result.needsReview,
      p_incident_district: input.incidentDistrict,
      p_incident_locality: input.incidentLocality,
      p_incident_public_location: input.incidentPublicLocation,
      p_citizen_name: input.citizenName,
      p_citizen_phone: input.citizenPhone,
      p_citizen_email: input.citizenEmail ?? "",
      p_residential_address: input.residentialAddress,
      p_predicted_department_id: result.primaryDepartmentId,
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
      prediction: {
        departmentId: result.primaryDepartmentId,
        departments: result.departments,
        confidence: result.confidence,
        probabilities: result.probabilities,
        isMultiLabel: result.isMultiLabel,
        hasHazard: result.hasHazard,
        needsReview: result.needsReview,
        issues: result.issues,
        modelVersion: result.modelVersion,
      },
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
