// Reproduce the isolated Run006 staging bundle without changing frozen artifacts.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = execFileSync("git",["rev-parse","--show-toplevel"],{encoding:"utf8"}).trim();
const git = (...args) => execFileSync("git",args,{cwd:root,maxBuffer:16*1024*1024});
const expectedBlob="653e148570c646d969d6c2da935767bbaa817a53";
const modelPath="data/v11/curriculum_runs/run_006/candidate_model.json";
const actualBlob=git("rev-parse","HEAD:"+modelPath).toString().trim();
if(actualBlob!==expectedBlob) throw new Error("Frozen Run006 blob differs: "+actualBlob);
const modelBytes=git("cat-file","blob",expectedBlob);
const model=JSON.parse(modelBytes.toString("utf8"));
const compact=JSON.stringify(model);
if(JSON.stringify(JSON.parse(compact))!==compact || model.departments.length!==6 ||
   model.word_idf.length+model.char_idf.length!==24978 ||
   !model.classifiers.every(c=>c.coef.length===24978 && c.coef.every(Number.isFinite) && c.intercept.every(Number.isFinite)))
 throw new Error("Run006 artifact integrity or dimensions invalid");
const sources={
 "index.ts":"tools/ai_factory/run006_candidate_edge.ts",
 "v11-engine.ts":"supabase/functions/_shared/v11-engine.ts",
 "v13_5_engine.ts":"src/services/v13_5/v13_5_engine.ts",
 "v13_4_engine.ts":"src/services/v13_4/v13_4_engine.ts",
 "issueRelationGraph.ts":"src/services/v13_4/issueRelationGraph.ts",
 "romanUrduNormalizer.ts":"src/services/v13_2/romanUrduNormalizer.ts",
};
const files={};
for(const [name,source] of Object.entries(sources)){
 let content=git("show","HEAD:"+source).toString("utf8");
 if(name!=="index.ts" && name!=="v11-engine.ts"){
  content=content.replace(/(\bfrom\s+['"])(?:\.\.?\/)+(?:[A-Za-z0-9_.-]+\/)*([A-Za-z0-9_-]+)(['"])/g,(whole,start,stem,end)=>{
   if(!Object.hasOwn(sources,stem+".ts"))throw new Error("Unresolved module "+stem);
   return start+"./"+stem+".ts"+end;
  });
 }
 files[name]=content;
}
files["model.json"]=compact;
const out=fs.mkdtempSync(path.join(os.tmpdir(),"aea-run006-"));
for(const [name,content] of Object.entries(files))fs.writeFileSync(path.join(out,name),content,"utf8");
const hash=(data)=>createHash("sha256").update(data).digest("hex");
const manifest={
 directory:out,sourceGitBlob:expectedBlob,
 sourceFileSha256:hash(modelBytes),embeddedChecksum:model.sha256_checksum,
 modelPackageSha256:hash(compact),modelValuesUnchanged:true,
 bundleSourceBytes:Object.values(files).reduce((n,s)=>n+Buffer.byteLength(s),0),
 files:Object.fromEntries(Object.entries(files).map(([name,s])=>[name,{bytes:Buffer.byteLength(s),sha256:hash(s)}])),
};
console.log(JSON.stringify(manifest,null,2));
// Do not deploy automatically. Review the bundle, run Deno typecheck and parity tests first.
