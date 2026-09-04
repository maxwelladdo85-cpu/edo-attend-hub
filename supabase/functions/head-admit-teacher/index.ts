// Admit a single teacher into the caller's own school.
// Allowed for head teachers (own school only) and admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "Unauthorized" }, 401);
    const caller = userRes.user;

    const [{ data: isHead }, { data: isAdmin }] = await Promise.all([
      userClient.rpc("has_role", { _user_id: caller.id, _role: "head_teacher" }),
      userClient.rpc("has_role", { _user_id: caller.id, _role: "admin" }),
    ]);
    if (!isHead && !isAdmin) return json({ error: "Head teacher role required" }, 403);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // School is ALWAYS taken from the caller's own profile — never from the request.
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("school_id, full_name")
      .eq("user_id", caller.id)
      .maybeSingle();

    const schoolId = callerProfile?.school_id;
    if (!schoolId) return json({ error: "Your school is not assigned yet." }, 400);

    const body = await req.json().catch(() => ({}));
    const fullName = String(body.full_name ?? "").trim();
    const teacherId = String(body.teacher_id ?? "").trim();
    const phone = body.phone ? String(body.phone).trim() : null;
    const classTaught = body.class_taught ? String(body.class_taught).trim() : null;
    const emailInput = body.email ? String(body.email).trim() : "";
    const password = String(body.password ?? "").trim() || "EdoSAS@2026";

    if (!fullName || !teacherId) {
      return json({ error: "Full name and Oracle ID are required." }, 400);
    }

    // Reject duplicate Oracle IDs up-front for a clear message.
    const { data: existing } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("teacher_id", teacherId)
      .maybeSingle();
    if (existing) return json({ error: "That Oracle ID is already in use." }, 409);

    const authEmail =
      emailInput && emailInput.toLowerCase() !== "nil"
        ? emailInput
        : `${teacherId.toLowerCase()}@edosubeb.gov.ng`;

    const { data, error } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: "teacher",
        school_id: schoolId,
        class_taught: classTaught,
        teacher_id: teacherId,
      },
    });

    if (error) return json({ error: error.message }, 400);

    return json({
      ok: true,
      user_id: data.user?.id,
      email: authEmail,
      teacher_id: teacherId,
      school_id: schoolId,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
