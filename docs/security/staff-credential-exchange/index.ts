// Staging staff credential exchange. No account identifiers are returned before authentication.
const headers = {"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","X-Content-Type-Options":"nosniff"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const invalid=()=>respond({error:"Invalid staff credentials."},401);
const departments=new Set(["kmc","kwsc","kelectric","ssgc","sswmb","sbca"]);
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
 if(req.method!=="POST") return respond({error:"Method not allowed."},405);
 try {
  const url=Deno.env.get("SUPABASE_URL"), service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), anon=Deno.env.get("SUPABASE_ANON_KEY");
  if(!url||!service||!anon) return respond({error:"Authentication temporarily unavailable."},503);
  if(Number(req.headers.get("content-length")||0)>4096) return respond({error:"Invalid request."},400);
  const raw=await req.text(); if(raw.length>4096) return respond({error:"Invalid request."},400);
  let b;try{b=JSON.parse(raw)}catch{return respond({error:"Invalid request."},400)}
  const identifier=typeof b?.identifier==="string"?b.identifier.trim().toLowerCase():"";
  const department=typeof b?.department==="string"?b.department.trim().toLowerCase():"";
  const password=typeof b?.password==="string"?b.password:"";
  if(!identifier||identifier.length>120||!departments.has(department)||!password||password.length>512) return invalid();
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(service),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(department+":"+identifier));
  const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
  const prepared=await fetch(url+"/rest/v1/rpc/v24_staff_login_prepare",{method:"POST",headers:{"Content-Type":"application/json",apikey:service,Authorization:"Bearer "+service},body:JSON.stringify({p_identifier:identifier,p_department:department,p_key_hash:hash})});
  if(!prepared.ok) return respond({error:"Authentication temporarily unavailable."},503);
  const result=await prepared.json();
  if(result?.allowed!==true) return respond({error:"Too many attempts. Try again later."},429);
  const known=typeof result.email==="string"&&typeof result.user_id==="string";
  const email=known?result.email:"missing-"+hash.slice(0,32)+"@example.invalid";
  const auth=await fetch(url+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json",apikey:anon},body:JSON.stringify({email,password})});
  if(!auth.ok) return auth.status===429?respond({error:"Too many attempts. Try again later."},429):invalid();
  const session=await auth.json();
  if(!known||session.user?.id!==result.user_id||typeof session.access_token!=="string"||typeof session.refresh_token!=="string") return invalid();
  return respond({access_token:session.access_token,refresh_token:session.refresh_token});
 } catch {return respond({error:"Authentication temporarily unavailable."},503);}
});
