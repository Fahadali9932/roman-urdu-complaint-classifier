import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed." }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer "))
    return json({ error: "Authentication required." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey)
    return json({ error: "Server configuration error." }, 500);

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await caller.auth.getUser();
  if (callerError || !callerData.user)
    return json({ error: "Invalid session." }, 401);

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "main_admin") {
    return json({ error: "Main Administrator access required." }, 403);
  }

  let payload: { email?: unknown; fullName?: unknown; departmentId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "A JSON body is required." }, 400);
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const fullName =
    typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const departmentId =
    typeof payload.departmentId === "string" ? payload.departmentId.trim() : "";
  if (
    !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ||
    fullName.length < 2 ||
    fullName.length > 120 ||
    !departmentId
  ) {
    return json({ error: "Invalid staff invitation details." }, 400);
  }

  const { data: department, error: departmentError } = await admin
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .eq("is_active", true)
    .maybeSingle();
  if (departmentError || !department)
    return json({ error: "Active department not found." }, 400);

  const { data: invitation, error: invitationError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: "department_staff" },
    });
  if (invitationError || !invitation.user) {
    return json({ error: "Unable to issue the staff invitation." }, 409);
  }

  const staffId = invitation.user.id;
  const { error: profileWriteError } = await admin.from("profiles").upsert({
    id: staffId,
    full_name: fullName,
    email,
    role: "department_staff",
    updated_at: new Date().toISOString(),
  });
  if (profileWriteError) {
    await admin.auth.admin.deleteUser(staffId);
    return json({ error: "Unable to provision staff profile." }, 500);
  }

  const { error: membershipError } = await admin
    .from("department_memberships")
    .upsert(
      {
        user_id: staffId,
        department_id: departmentId,
        status: "active",
        approved_by: callerData.user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,department_id" },
    );
  if (membershipError) {
    await admin.from("profiles").delete().eq("id", staffId);
    await admin.auth.admin.deleteUser(staffId);
    return json({ error: "Unable to provision staff membership." }, 500);
  }

  await admin.from("access_audit_log").insert({
    action: "admin_provisioned",
    target_user_id: staffId,
    target_email: email,
    department_id: departmentId,
    actor_id: callerData.user.id,
    details: { source: "provision-department-staff Edge Function" },
  });

  return json({ success: true, staffUserId: staffId }, 201);
});
