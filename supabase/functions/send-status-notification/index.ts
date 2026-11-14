import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEPARTMENT_LABELS: Record<string, string> = {
  kmc: "Karachi Metropolitan Corporation (KMC / DMCs)",
  ke: "K-Electric (Electricity Supply & Grid)",
  kwsc: "Karachi Water & Sewerage Corporation (KW&SC)",
  ssgc: "Sui Southern Gas Company (SSGC)",
  sswmb: "Sindh Solid Waste Management Board (SSWMB)",
  sbca: "Sindh Building Control Authority (SBCA)",
};

const STATUS_TITLES: Record<string, { en: string; ur: string }> = {
  accepted: {
    en: "Complaint Accepted by Department",
    ur: "محکمے کی جانب سے شکایت منظور کر لی گئی ہے",
  },
  in_progress: {
    en: "Field Work & Remediation In Progress",
    ur: "شکایت پر ازالے کی کارروائی جاری ہے",
  },
  resolved: {
    en: "Remediation Completed & Verified",
    ur: "شکایت کا مسئلہ حل کر دیا گیا ہے",
  },
  rejected: {
    en: "Complaint Closed / Not Actionable",
    ur: "شکایت کی جانچ کے بعد کارروائی بند کر دی گئی ہے",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json({ error: "Server configuration missing." }, 500);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify caller identity (must be authenticated staff or admin)
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData.user) {
    return json({ error: "Invalid staff session." }, 401);
  }

  const payload = await req.json().catch(() => null);
  if (!payload || !payload.complaintId || !payload.newStatus) {
    return json({ error: "Invalid notification payload. complaintId and newStatus are required." }, 400);
  }

  const { complaintId, newStatus, note, title } = payload;

  // 1. Fetch complaint metadata
  const { data: complaint, error: compError } = await admin
    .from("complaints")
    .select("id, reference_number, title, description, incident_district, incident_locality, assigned_department_id")
    .eq("id", complaintId)
    .maybeSingle();

  if (compError || !complaint) {
    return json({ error: "Complaint not found." }, 404);
  }

  // 2. Fetch citizen private contact info (Zero staff access via RLS)
  const { data: citizenPrivate, error: privateError } = await admin
    .from("complaint_citizen_private")
    .select("citizen_name, citizen_email")
    .eq("complaint_id", complaintId)
    .maybeSingle();

  if (privateError || !citizenPrivate || !citizenPrivate.citizen_email) {
    // Citizen did not provide email or private record missing
    return json({
      success: true,
      delivered: false,
      reason: "citizen_email_not_provided",
      referenceNumber: complaint.reference_number,
    });
  }

  const recipientEmail = citizenPrivate.citizen_email.trim();
  const recipientName = citizenPrivate.citizen_name.trim() || "Citizen";
  const deptName = DEPARTMENT_LABELS[complaint.assigned_department_id] || complaint.assigned_department_id.toUpperCase();
  const statusInfo = STATUS_TITLES[newStatus] || {
    en: `Status Updated: ${newStatus}`,
    ur: "شکایت کی حیثیت تبدیل ہو گئی ہے",
  };

  const subject = `[Awaaz-e-Awam] Complaint ${complaint.reference_number}: ${statusInfo.en}`;
  const trackingUrl = `https://awaaz-e-awam.pk/track/${complaint.referenceNumber || complaint.reference_number}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; color: #171717; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e3e0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
          .header { background: #681822; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
          .body { padding: 28px; }
          .status-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
          .status-accepted { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
          .status-in_progress { background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; }
          .status-resolved { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
          .status-rejected { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
          .details-table td { padding: 10px 12px; border-bottom: 1px solid #f0ede8; }
          .details-table td.label { font-weight: 600; color: #666; width: 38%; }
          .note-box { background: #faf9f7; border-left: 4px solid #681822; padding: 14px 18px; margin: 20px 0; border-radius: 4px; font-size: 14px; line-height: 1.6; }
          .cta-btn { display: inline-block; background: #681822; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 20px 0 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #eee; background: #faf9f7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AWAAZ-E-AWAM • آوازِ عوام</h1>
            <p>Karachi Municipal Complaint Routing System</p>
          </div>
          <div class="body">
            <p>Mohtaram <strong>${recipientName}</strong>,</p>
            <p>Aap ki darj karda shikayat ka status update hua hai:</p>
            
            <div class="status-badge status-${newStatus}">
              ${statusInfo.en} • ${statusInfo.ur}
            </div>

            <table class="details-table">
              <tr>
                <td class="label">Reference Number</td>
                <td><strong>${complaint.reference_number}</strong></td>
              </tr>
              <tr>
                <td class="label">Responsible Agency</td>
                <td>${deptName}</td>
              </tr>
              <tr>
                <td class="label">Location</td>
                <td>${complaint.incident_locality}, ${complaint.incident_district}</td>
              </tr>
            </table>

            ${
              note
                ? `<div class="note-box">
                    <strong>Department Remarks / Mehakmay Ka Paigham:</strong><br />
                    ${note}
                  </div>`
                : ""
            }

            <p style="font-size: 13px; color: #555;">
              Aap apni shikayat ki mukammal tareekh aur live progress Awaaz-e-Awam portal par dekh saktay hain:
            </p>

            <a href="${trackingUrl}" class="cta-btn">View Live Timeline / پیش رفت دیکھیں</a>
          </div>
          <div class="footer">
            <p>Zero-PII Privacy Enforced • Greenwich University Academic Demonstration</p>
            <p>This is an automated municipal notification. Do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Check transactional provider (Resend API)
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  let deliveryStatus = "pending";
  let deliveryError: string | null = null;
  let sentAt: string | null = null;

  if (resendApiKey) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Awaaz-e-Awam <onboarding@resend.dev>",
          to: [recipientEmail],
          subject,
          html: htmlBody,
        }),
      });

      if (resendRes.ok) {
        deliveryStatus = "sent";
        sentAt = new Date().toISOString();
      } else {
        const errJson = await resendRes.json();
        deliveryStatus = "failed";
        deliveryError = JSON.stringify(errJson);
      }
    } catch (e) {
      deliveryStatus = "failed";
      deliveryError = e instanceof Error ? e.message : String(e);
    }
  } else {
    // Provider API key not yet attached in environment secrets
    deliveryStatus = "logged";
    deliveryError = "RESEND_API_KEY secret not configured in Supabase environment.";
  }

  // Record delivery attempt into public.complaint_notification_outbox
  try {
    await admin.from("complaint_notification_outbox").insert({
      complaint_id: complaint.id,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      event_type: "status_updated",
      status: newStatus,
      payload: {
        reference_number: complaint.reference_number,
        new_status: newStatus,
        subject,
        note: note || null,
        title: title || statusInfo.en,
      },
      delivery_status: deliveryStatus,
      delivery_error: deliveryError,
      sent_at: sentAt,
    });
  } catch (err) {
    console.error("Failed to insert notification outbox record:", err);
  }

  // Never return citizen's email to caller
  return json({
    success: true,
    delivered: deliveryStatus === "sent",
    deliveryStatus,
    referenceNumber: complaint.reference_number,
  });
});
