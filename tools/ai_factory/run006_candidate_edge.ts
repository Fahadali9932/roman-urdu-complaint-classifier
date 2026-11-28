// Staging-only inference evaluator. Never routes or persists citizen complaints.
import model from "./model.json" with { type: "json" };
import { classifyV11RelationAware, type V11ModelArtifact } from "./v11-engine.ts";
import { classifyV13_5 } from "./v13_5_engine.ts";

const artifact = model as unknown as V11ModelArtifact;
const SOURCE_BLOB = "653e148570c646d969d6c2da935767bbaa817a53";
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
Deno.serve(async req => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || req.headers.get("authorization") !== "Bearer " + serviceKey) return json({error:"Forbidden"},403);
  if (req.method !== "POST") return json({error:"POST required"},405);
  if (!req.body || Number(req.headers.get("content-length") || 0) > 8192) return json({error:"Request too large"},413);
  try {
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const {done,value} = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 8192) { await reader.cancel(); return json({error:"Request too large"},413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset=0;
    for(const chunk of chunks){ bytes.set(chunk,offset);offset+=chunk.length; }
    const {text} = JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
    if (typeof text !== "string" || !text.trim() || text.length>6000 || text.trim().split(/\s+/).length>200)
      return json({error:"Provide 1 to 200 words of synthetic evaluation text"},400);
    const t0=performance.now();
    const raw=classifyV11RelationAware(text,artifact);
    const rawMs=performance.now()-t0;
    const t1=performance.now();
    const policy=classifyV13_5(text,artifact);
    const policyMs=performance.now()-t1;
    return json({
      candidate:"Run006",
      sourceGitBlob:SOURCE_BLOB,
      artifactChecksum:artifact.sha256_checksum,
      raw:{departments:raw.departments,rawProbabilities:raw.rawProbabilities,probabilities:raw.probabilities,needsReview:raw.needsReview},
      policy:{departments:policy.departments,allDetectedDepartments:policy.allDetectedDepartments,rawProbabilities:policy.rawProbabilities,probabilities:policy.probabilities,needsReview:policy.needsReview,reviewReason:policy.reviewReason,decisionPolicy:policy.decisionPolicy,twoDeptPolicyTriggered:policy.twoDeptPolicyTriggered},
      rawMs,policyMs,
    });
  } catch { return json({error:"Evaluation failed"},400); }
});
