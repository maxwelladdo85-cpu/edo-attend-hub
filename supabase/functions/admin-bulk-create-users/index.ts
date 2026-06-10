// Bulk-create teacher/head-teacher accounts (admin only, service role).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UserRow {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  teacher_id: string;
  role: "teacher" | "head_teacher";
  school_id: string;
  class_taught?: string | null;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const users: UserRow[] = body.users ?? [];
    const defaultPassword: string = body.default_password ?? "EdoSAS@2026";

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const results: any[] = [];

    for (const u of users) {
      try {
        const tid = u.teacher_id.trim();
        const authEmail =
          u.email && u.email.trim() && u.email.trim().toLowerCase() !== "nil"
            ? u.email.trim()
            : `${tid.toLowerCase()}@edosubeb.gov.ng`;

        const { data, error } = await admin.auth.admin.createUser({
          email: authEmail,
          password: u.password ?? defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: u.full_name,
            phone: u.phone ?? null,
            role: u.role,
            school_id: u.school_id,
            class_taught: u.class_taught ?? null,
            teacher_id: tid,
          },
        });

        if (error) {
          results.push({ teacher_id: tid, status: "error", message: error.message });
        } else {
          results.push({ teacher_id: tid, status: "ok", user_id: data.user?.id, email: authEmail });
        }
      } catch (e) {
        results.push({ teacher_id: u.teacher_id, status: "error", message: String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
