import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_MUTATIONS = 20;
const recentMutations = new Map<string, number[]>();

function isRateLimited(actorId: string): boolean {
  const now = Date.now();
  const kept = (recentMutations.get(actorId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (kept.length >= RATE_MAX_MUTATIONS) {
    recentMutations.set(actorId, kept);
    return true;
  }
  kept.push(now);
  recentMutations.set(actorId, kept);
  return false;
}

function decodeClaims(jwt: string): { aal?: string } {
  try {
    const part = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part));
  } catch {
    return {};
  }
}

/** Cryptographically random, high-entropy 18-character temporary access key. Never stored in plaintext. */
function generateTemporaryAccessKey(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%*-_";
  const all = upper + lower + digits + symbols;
  const pick = (pool: string) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return pool[arr[0] % pool.length];
  };
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 18) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function normalizeEmployeeId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (cleaned.length < 2 || cleaned.length > 40) return null;
  return cleaned;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Authentication required." }, 401);
  }
  const jwt = authHeader.slice(7).trim();

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) {
    return json({ error: "Server configuration error." }, 500);
  }

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData.user) {
    return json({ error: "Invalid session." }, 401);
  }
  if (decodeClaims(jwt).aal !== "aal2") {
    return json({ error: "Authenticator MFA verification (AAL2) required." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Valid JSON payload required." }, 400);
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (isRateLimited(callerData.user.id)) {
    return json({ error: "Too many credential requests. Wait a minute before retrying." }, 429);
  }

  // Self-service forced first-login password update (any active officer whose must_change_password = true)
  if (action === "complete_first_login_password") {
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < 15 || newPassword.length > 128) {
      return json({ error: "New passphrase must be 15 to 128 characters long." }, 400);
    }
    const { data: mem, error: memErr } = await admin
      .from("department_memberships")
      .select("id, department_id, status, staff_role, must_change_password")
      .eq("user_id", callerData.user.id)
      .eq("status", "active")
      .maybeSingle();

    if (memErr || !mem) {
      return json({ error: "Active department membership required." }, 403);
    }

    // Update via caller's authenticated AAL2 session directly against GoTrue /auth/v1/user
    // so the current token stays valid rather than revoking all sessions via admin.updateUserById.
    const pwRes = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!pwRes.ok) {
      return json({ error: "Unable to update account passphrase." }, 400);
    }

    const { error: updErr } = await admin
      .from("department_memberships")
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mem.id);
    if (updErr) {
      return json({ error: "Passphrase updated but membership unlock failed." }, 500);
    }

    await admin.from("access_audit_log").insert({
      action: "officer_password_changed",
      target_user_id: callerData.user.id,
      target_email: callerData.user.email || "officer@awaaz-e-awam.org",
      department_id: mem.department_id,
      actor_id: callerData.user.id,
      details: { source: "manage-department-officers", mustChangePasswordCleared: true },
    });

    return json({ success: true, mustChangePassword: false }, 200);
  }

  // All remaining actions strictly require an active Department Head managing ONLY their own department officers.
  const departmentId = typeof body.departmentId === "string" ? body.departmentId.trim() : "";
  if (!departmentId) {
    return json({ error: "Department identifier required." }, 400);
  }

  const { data: callerMembership } = await admin
    .from("department_memberships")
    .select("id, staff_role, status, department_id")
    .eq("user_id", callerData.user.id)
    .eq("department_id", departmentId)
    .eq("status", "active")
    .maybeSingle();

  if (!callerMembership || callerMembership.staff_role !== "head") {
    return json({ error: "Active Department Head authorization within your own department is required." }, 403);
  }

  if (action === "create_officer") {
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const employeeId = normalizeEmployeeId(body.employeeId);
    if (fullName.length < 2 || fullName.length > 100 || !employeeId) {
      return json({ error: "Provide a full name (2-100 chars) and valid Employee ID (letters, numbers, hyphens)." }, 400);
    }

    const staffUsername = `${departmentId}-${employeeId}`;
    const syntheticEmail = `staff+${departmentId}.${employeeId}@awaaz-e-awam.org`;

    // Enforce uniqueness in department before creating Auth account
    const { data: existingEmp } = await admin
      .from("department_memberships")
      .select("id")
      .eq("department_id", departmentId)
      .ilike("employee_id", employeeId)
      .maybeSingle();

    if (existingEmp) {
      return json({ error: `Employee ID '${employeeId}' is already registered in this department.` }, 409);
    }

    const tempKey = generateTemporaryAccessKey();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password: tempKey,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "department_staff",
        employee_id: employeeId,
      },
    });

    if (createErr || !created.user) {
      return json({ error: createErr?.message || "Unable to provision officer Auth identity." }, 409);
    }

    const newUserId = created.user.id;
    const rollbackAuth = async () => {
      try {
        await admin.auth.admin.deleteUser(newUserId);
      } catch {
        // Leave cleanup signal cleanly via 500 error if deletion also fails
      }
    };

    const { error: profErr } = await admin.from("profiles").upsert({
      id: newUserId,
      full_name: fullName,
      email: syntheticEmail,
      role: "department_staff",
    }, { onConflict: "id" });
    if (profErr) {
      await rollbackAuth();
      return json({ error: "Profile provisioning failed; partial auth record rolled back cleanly." }, 500);
    }

    const { error: memInsertErr } = await admin.from("department_memberships").insert({
      user_id: newUserId,
      department_id: departmentId,
      status: "active",
      staff_role: "officer",
      employee_id: employeeId,
      staff_username: staffUsername,
      must_change_password: true,
      approved_by: callerData.user.id,
      approved_at: new Date().toISOString(),
    });
    if (memInsertErr) {
      await admin.from("profiles").delete().eq("id", newUserId);
      await rollbackAuth();
      return json({ error: "Membership provisioning failed; officer creation rolled back safely." }, 500);
    }

    await admin.from("access_audit_log").insert({
      action: "head_provisioned_officer",
      target_user_id: newUserId,
      target_email: syntheticEmail,
      department_id: departmentId,
      actor_id: callerData.user.id,
      details: { employee_id: employeeId, staff_username: staffUsername, staff_role: "officer" },
    });

    // Return temporary access key strictly once in memory; never persisted anywhere.
    return json({
      success: true,
      officerUserId: newUserId,
      employeeId,
      staffUsername,
      temporaryAccessKey: tempKey,
      mustChangePassword: true,
    }, 201);
  }

  // Remaining actions operate on an existing officer within caller's own department
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";
  if (!targetUserId) return json({ error: "Target officer user ID required." }, 400);

  const { data: targetMem, error: targetErr } = await admin
    .from("department_memberships")
    .select("id, user_id, department_id, staff_role, status, employee_id, staff_username")
    .eq("user_id", targetUserId)
    .eq("department_id", departmentId)
    .maybeSingle();

  if (targetErr || !targetMem) {
    return json({ error: "Target officer membership not found in your department." }, 404);
  }
  if (targetMem.staff_role !== "officer") {
    return json({ error: "Heads can only manage field officers, never heads or administrators." }, 403);
  }
  if (targetMem.status === "revoked") {
    return json({ error: "Permanently revoked accounts require administrator restoration." }, 403);
  }

  const { data: targetProf } = await admin
    .from("profiles")
    .select("email, role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetProf?.role === "main_admin") {
    return json({ error: "Administrators cannot be modified by department heads." }, 403);
  }

  if (action === "reset_credentials") {
    const newTempKey = generateTemporaryAccessKey();
    const { error: pwErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: newTempKey,
    });
    if (pwErr) return json({ error: "Failed to rotate officer credentials." }, 500);

    try {
      await admin.auth.admin.signOut(targetUserId, "global");
    } catch {
      // Best-effort token revocation; must_change_password flag immediately blocks DB operations
    }

    await admin
      .from("department_memberships")
      .update({
        must_change_password: true,
        credential_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetMem.id);

    await admin.from("access_audit_log").insert({
      action: "officer_credentials_reset",
      target_user_id: targetUserId,
      target_email: targetProf?.email || "officer@awaaz-e-awam.org",
      department_id: departmentId,
      actor_id: callerData.user.id,
      details: { employee_id: targetMem.employee_id },
    });

    return json({
      success: true,
      officerUserId: targetUserId,
      temporaryAccessKey: newTempKey,
      mustChangePassword: true,
    }, 200);
  }

  if (action === "suspend_officer") {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 8) {
      return json({ error: "Suspension reason must be at least 8 characters." }, 400);
    }

    await admin
      .from("department_memberships")
      .update({
        status: "suspended",
        suspended_by: callerData.user.id,
        suspended_at: new Date().toISOString(),
        suspension_reason: reason.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetMem.id);

    try {
      await admin.auth.admin.signOut(targetUserId, "global");
    } catch {
      // RLS immediately blocks active JWTs as well
    }

    // Preserve active work orders without dropping them; log reassignment advisory on each active order
    const { data: openOrders } = await admin
      .from("department_work_orders")
      .select("id")
      .eq("department_id", departmentId)
      .eq("officer_id", targetUserId)
      .neq("status", "verified");

    if (Array.isArray(openOrders) && openOrders.length > 0) {
      await admin.from("department_work_events").insert(
        openOrders.map((o: { id: string }) => ({
          order_id: o.id,
          actor_id: callerData.user.id,
          event_type: "officer_suspended_notice",
          detail: "Assigned officer was suspended; reassign order to an active officer.",
        }))
      );
    }

    await admin.from("access_audit_log").insert({
      action: "officer_suspended",
      target_user_id: targetUserId,
      target_email: targetProf?.email || "officer@awaaz-e-awam.org",
      department_id: departmentId,
      actor_id: callerData.user.id,
      details: { reason: reason.slice(0, 500), activeOrdersCount: openOrders?.length || 0 },
    });

    return json({
      success: true,
      officerUserId: targetUserId,
      status: "suspended",
      openOrdersPreserved: openOrders?.length || 0,
    }, 200);
  }

  if (action === "reactivate_officer") {
    await admin
      .from("department_memberships")
      .update({
        status: "active",
        suspended_by: null,
        suspended_at: null,
        suspension_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetMem.id);

    await admin.from("access_audit_log").insert({
      action: "officer_reactivated",
      target_user_id: targetUserId,
      target_email: targetProf?.email || "officer@awaaz-e-awam.org",
      department_id: departmentId,
      actor_id: callerData.user.id,
      details: { employee_id: targetMem.employee_id },
    });

    return json({ success: true, officerUserId: targetUserId, status: "active" }, 200);
  }

  return json({ error: "Unsupported action." }, 400);
});
