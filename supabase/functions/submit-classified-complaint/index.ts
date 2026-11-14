import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import model from "./model.json" with { type: "json" };

type Model = {
  classes: string[]; vocabulary: Record<string, number>; idf: number[];
  coef: number[][]; intercept: number[]; ngram_range: [number, number];
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

function features(text: string): Map<number, number> {
  const counts = new Map<number, number>();
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
  let norm = 0;
  for (const [column, count] of counts) { const weighted = count * classifier.idf[column]; counts.set(column, weighted); norm += weighted * weighted; }
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
  return { departmentId: classifier.classes[ordered[0].index], confidence, needsReview: confidence < 0.50 || margin < 0.10 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: identity, error: identityError } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
    if (identityError || !identity.user) return json({ error: "Invalid session." }, 401);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", identity.user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Could not verify submitting account role", profileError);
      return json({ error: "Submission service is temporarily unavailable.", code: "SUBMISSION_UNAVAILABLE" }, 500);
    }
    if (profile?.role !== "citizen") {
      return json({ error: "A citizen account is required to submit a complaint.", code: "CITIZEN_ACCOUNT_REQUIRED" }, 403);
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

    const result = classify(`${input.title ?? ""} ${input.description}`);
    const { data, error } = await admin.rpc("submit_citizen_complaint", {
      p_citizen_id: identity.user.id, p_title: input.title ?? "", p_description: input.description,
      p_incident_district: input.incidentDistrict, p_incident_locality: input.incidentLocality,
      p_incident_public_location: input.incidentPublicLocation, p_citizen_name: input.citizenName,
      p_citizen_phone: input.citizenPhone, p_citizen_email: input.citizenEmail ?? "",
      p_residential_address: input.residentialAddress, p_predicted_department_id: result.departmentId,
      p_prediction_confidence: result.confidence, p_needs_review: result.needsReview,
      p_is_demonstration: input.isDemonstration === true,
    });
    if (error) {
      console.error("Complaint submission RPC failed", error);
      return json({ error: "Submission service is temporarily unavailable.", code: "SUBMISSION_UNAVAILABLE" }, 500);
    }
    return json({ ...data, prediction: result });
  } catch (error) {
    console.error("Unexpected complaint submission failure", error);
    return json({ error: "Submission service is temporarily unavailable.", code: "SUBMISSION_UNAVAILABLE" }, 500);
  }
});
