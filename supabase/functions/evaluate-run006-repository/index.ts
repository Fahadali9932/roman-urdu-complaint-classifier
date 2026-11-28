import { classifyV11RelationAware, assessComplaintDraft, type V11ModelArtifact } from './v11-engine.ts';
import model from './run006.compact.json' with { type: 'json' };
const artifact = model as unknown as V11ModelArtifact;
// Fixed synthetic inputs only; never accepts citizen data or mutates database.
const cases = [
  {id:'electricity', text:'Korangi mein do din se bijli nahi aa rahi hai.', expected:['kelectric']},
  {id:'water', text:'Gulshan mein teen din se pani nahi aa raha.', expected:['kwsc']},
  {id:'garbage', text:'Tariq Road par kachra jama hai aur koi uthata nahi.', expected:['sswmb']},
  {id:'gas', text:'North Karachi mein gas nahi aa rahi, choolha nahi jalta.', expected:['ssgc']},
  {id:'independent', text:'Korangi mein bijli nahi aa rahi aur sadak bhi toot gayi hai.', expected:['kelectric','kmc']},
  {id:'three', text:'Korangi mein bijli nahi aa rahi, gas bhi band hai aur kachra nahi uthaya ja raha.', expected:null},
  {id:'causal', text:'Korangi mein bijli nahi hai jis ki wajah se pani ki motor nahi chal rahi.', expected:['kelectric']},
];
Deno.serve((req) => {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || req.headers.get('Authorization') !== 'Bearer '+secret) return new Response('Forbidden',{status:403});
  if(req.method!=='POST') return new Response('Method not allowed',{status:405});
  const results=cases.map(c=>{
    const t=performance.now();
    const raw=classifyV11RelationAware(c.text,artifact);
    const assessment=assessComplaintDraft(c.text,artifact);
    const departments=assessment.state==='ready'?assessment.departments:raw.departments;
    const auto=assessment.state==='ready'&&!raw.needsReview&&departments.length>=1&&departments.length<=2;
    const actual=auto?[...departments].sort():[];
    return {id:c.id,actual,manualReview:!auto,expected:c.expected,pass:c.expected===null?!auto:JSON.stringify(actual)===JSON.stringify([...c.expected].sort()),latencyMs:performance.now()-t};
  });
  return Response.json({artifact:'repository-run006',embeddedChecksum:artifact.sha256_checksum,results,passCount:results.filter(x=>x.pass).length,total:results.length},{headers:{'Cache-Control':'no-store'}});
});
