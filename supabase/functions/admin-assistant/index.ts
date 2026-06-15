// Edo Attendance AI Assistant - admin-only data Q&A with tool calling
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "google/gemini-3-flash-preview";

const tools = [
  {
    type: "function",
    function: {
      name: "get_overview",
      description: "High-level totals across the system: number of schools, LGAs, school categories, total students, total teachers, and today's attendance summary (present/absent counts for students & teachers).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_schools",
      description: "List schools with optional filters by LGA or school category. Returns up to 'limit' rows.",
      parameters: {
        type: "object",
        properties: {
          lga: { type: "string", description: "Local Government Area name" },
          category: { type: "string", description: "School category (e.g. Primary, JSS, SSS)" },
          name_contains: { type: "string", description: "Case-insensitive substring of school name" },
          limit: { type: "number", description: "Max rows (default 25, max 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schools_breakdown",
      description: "Aggregate count of schools grouped by 'lga' or by 'category'.",
      parameters: {
        type: "object",
        properties: { group_by: { type: "string", enum: ["lga", "category"] } },
        required: ["group_by"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "student_attendance_summary",
      description: "Summary of student attendance for a given date (default = today). Optionally filter by school_id or lga. Returns present, absent, total, percentage.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          school_id: { type: "string" },
          lga: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "teacher_attendance_summary",
      description: "Summary of teacher attendance for a given date (default = today). Optionally filter by school_id or lga. Returns arrived, departed, verified, total.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          school_id: { type: "string" },
          lga: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_students",
      description: "Search students by name (case-insensitive) or by school_id.",
      parameters: {
        type: "object",
        properties: {
          name_contains: { type: "string" },
          school_id: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_teachers",
      description: "Search teacher profiles by name or by school_id.",
      parameters: {
        type: "object",
        properties: {
          name_contains: { type: "string" },
          school_id: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_flagged_attendance",
      description: "Recent flagged attendance records (late arrivals, out-of-range locations). Returns up to 'limit' rows (default 20).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD; default = today" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_audit_logs",
      description: "Most recent admin audit log entries.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
];

const SYSTEM_PROMPT = `You are "Edo Attendance AI Assistant", an analytics helper for administrators of the Edo State Subeb attendance platform.

Use the provided tools to look up REAL data before answering. Never invent numbers. If a tool returns no data, say so plainly.

When answering:
- Be concise, factual, and friendly. Use markdown (bold, bullets, tables) when it helps.
- Reference dates and filters used.
- If the user is vague, make a reasonable assumption (e.g. "today", "all LGAs") and state it.

ALWAYS end your final response with a JSON code block on its own, EXACTLY in this form (no extra commentary after it):
\`\`\`json
{"suggestions":["...","...","..."]}
\`\`\`
The 'suggestions' array must contain 3 short, relevant follow-up questions the user is likely to ask next, written in the user's voice (first person, e.g. "Show me…", "How many…").`;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function clampLimit(n: unknown, def = 25, max = 100) {
  const v = typeof n === "number" ? n : def;
  return Math.max(1, Math.min(max, Math.floor(v)));
}

// Service-role client used inside tools (admin already verified)
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case "get_overview": {
        const [schools, students, teachers, sAtt, tAtt] = await Promise.all([
          admin.from("schools").select("*", { count: "exact", head: true }),
          admin.from("students").select("*", { count: "exact", head: true }),
          admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
          admin.from("student_attendance").select("morning_status,afternoon_status").eq("attendance_date", todayStr()),
          admin.from("teacher_attendance").select("arrival_time,departure_time,head_verified").eq("attendance_date", todayStr()),
        ]);
        const [lgas, cats] = await Promise.all([
          admin.from("schools").select("lga"),
          admin.from("schools").select("category"),
        ]);
        const lgaSet = new Set((lgas.data ?? []).map((r: any) => r.lga).filter(Boolean));
        const catSet = new Set((cats.data ?? []).map((r: any) => r.category).filter(Boolean));
        const sPresent = (sAtt.data ?? []).filter((r: any) => r.morning_status === "present" || r.afternoon_status === "present").length;
        const tArrived = (tAtt.data ?? []).filter((r: any) => r.arrival_time).length;
        const tDeparted = (tAtt.data ?? []).filter((r: any) => r.departure_time).length;
        const tVerified = (tAtt.data ?? []).filter((r: any) => r.head_verified).length;
        return {
          date: todayStr(),
          schools_total: schools.count ?? 0,
          students_total: students.count ?? 0,
          teachers_total: teachers.count ?? 0,
          lgas_total: lgaSet.size,
          categories: Array.from(catSet),
          today_student_present: sPresent,
          today_student_records: sAtt.data?.length ?? 0,
          today_teacher_arrived: tArrived,
          today_teacher_departed: tDeparted,
          today_teacher_verified: tVerified,
          today_teacher_records: tAtt.data?.length ?? 0,
        };
      }
      case "list_schools": {
        let q = admin.from("schools").select("id,name,lga,category").order("name");
        if (args.lga) q = q.eq("lga", String(args.lga));
        if (args.category) q = q.eq("category", String(args.category));
        if (args.name_contains) q = q.ilike("name", `%${String(args.name_contains)}%`);
        q = q.limit(clampLimit(args.limit));
        const { data, error } = await q;
        if (error) throw error;
        return { count: data?.length ?? 0, schools: data };
      }
      case "schools_breakdown": {
        const col = args.group_by === "category" ? "category" : "lga";
        const { data, error } = await admin.from("schools").select(col);
        if (error) throw error;
        const counts: Record<string, number> = {};
        for (const r of data ?? []) {
          const k = ((r as any)[col] ?? "Unknown") as string;
          counts[k] = (counts[k] ?? 0) + 1;
        }
        return { group_by: col, breakdown: Object.entries(counts).map(([k, v]) => ({ key: k, count: v })).sort((a, b) => b.count - a.count) };
      }
      case "student_attendance_summary": {
        const date = String(args.date ?? todayStr());
        let schoolIds: string[] | null = null;
        if (args.lga) {
          const { data } = await admin.from("schools").select("id").eq("lga", String(args.lga));
          schoolIds = (data ?? []).map((r: any) => r.id);
        }
        if (args.school_id) schoolIds = [String(args.school_id)];
        let totalQ = admin.from("students").select("*", { count: "exact", head: true });
        if (schoolIds) totalQ = totalQ.in("school_id", schoolIds);
        let attQ = admin.from("student_attendance").select("morning_status,afternoon_status,school_id").eq("attendance_date", date);
        if (schoolIds) attQ = attQ.in("school_id", schoolIds);
        const [tot, att] = await Promise.all([totalQ, attQ]);
        const present = (att.data ?? []).filter((r: any) => r.morning_status === "present" || r.afternoon_status === "present").length;
        const records = att.data?.length ?? 0;
        const total = tot.count ?? 0;
        return {
          date,
          scope: args.school_id ? { school_id: args.school_id } : args.lga ? { lga: args.lga } : "all",
          total_students: total,
          attendance_records: records,
          present,
          absent: Math.max(0, records - present),
          percent_present: total ? Math.round((present / total) * 100) : null,
        };
      }
      case "teacher_attendance_summary": {
        const date = String(args.date ?? todayStr());
        let schoolIds: string[] | null = null;
        if (args.lga) {
          const { data } = await admin.from("schools").select("id").eq("lga", String(args.lga));
          schoolIds = (data ?? []).map((r: any) => r.id);
        }
        if (args.school_id) schoolIds = [String(args.school_id)];
        let q = admin.from("teacher_attendance").select("arrival_time,departure_time,head_verified,school_id").eq("attendance_date", date);
        if (schoolIds) q = q.in("school_id", schoolIds);
        const { data } = await q;
        const arrived = (data ?? []).filter((r: any) => r.arrival_time).length;
        const departed = (data ?? []).filter((r: any) => r.departure_time).length;
        const verified = (data ?? []).filter((r: any) => r.head_verified).length;
        return { date, scope: args.school_id ?? args.lga ?? "all", records: data?.length ?? 0, arrived, departed, verified };
      }
      case "search_students": {
        let q = admin.from("students").select("id,student_id,full_name,school_id,class,gender").limit(clampLimit(args.limit, 25, 50));
        if (args.name_contains) q = q.ilike("full_name", `%${String(args.name_contains)}%`);
        if (args.school_id) q = q.eq("school_id", String(args.school_id));
        const { data, error } = await q;
        if (error) throw error;
        return { count: data?.length ?? 0, students: data };
      }
      case "search_teachers": {
        let q = admin.from("profiles").select("user_id,full_name,school_id,class_taught,teacher_id").limit(clampLimit(args.limit, 25, 50));
        if (args.name_contains) q = q.ilike("full_name", `%${String(args.name_contains)}%`);
        if (args.school_id) q = q.eq("school_id", String(args.school_id));
        const { data, error } = await q;
        if (error) throw error;
        return { count: data?.length ?? 0, teachers: data };
      }
      case "get_flagged_attendance": {
        const date = String(args.date ?? todayStr());
        const limit = clampLimit(args.limit, 20, 100);
        const { data, error } = await admin
          .from("teacher_attendance")
          .select("id,school_id,teacher_id,attendance_date,arrival_time,departure_time,arrival_lat,arrival_lng,head_verified")
          .eq("attendance_date", date)
          .order("arrival_time", { ascending: false })
          .limit(limit);
        if (error) throw error;
        // "Flagged" = unverified or no departure
        const flagged = (data ?? []).filter((r: any) => !r.head_verified || !r.departure_time);
        return { date, count: flagged.length, records: flagged };
      }
      case "get_audit_logs": {
        const limit = clampLimit(args.limit, 20, 100);
        const { data, error } = await admin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
        if (error) throw error;
        return { count: data?.length ?? 0, logs: data };
      }
    }
    return { error: `Unknown tool: ${name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

function parseFinal(text: string): { answer: string; suggestions: string[] } {
  const m = text.match(/```json\s*([\s\S]*?)\s*```\s*$/i);
  let suggestions: string[] = [];
  let answer = text;
  if (m) {
    try {
      const obj = JSON.parse(m[1]);
      if (Array.isArray(obj?.suggestions)) suggestions = obj.suggestions.slice(0, 3).map(String);
      answer = text.slice(0, m.index).trim();
    } catch { /* ignore */ }
  }
  if (suggestions.length === 0) {
    suggestions = ["Show today's overall attendance", "Which LGAs have the lowest attendance?", "List schools with no records today"];
  }
  return { answer, suggestions };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = await req.json();
    let { threadId, message } = body as { threadId?: string; message: string };
    if (!message || typeof message !== "string") return json({ error: "message required" }, 400);

    // Create thread if needed
    if (!threadId) {
      const title = message.slice(0, 60);
      const { data: t, error } = await admin
        .from("assistant_threads")
        .insert({ user_id: user.id, title })
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 500);
      threadId = t.id;
    } else {
      // verify ownership
      const { data: t } = await admin.from("assistant_threads").select("id,user_id").eq("id", threadId).maybeSingle();
      if (!t || t.user_id !== user.id) return json({ error: "Thread not found" }, 404);
      await admin.from("assistant_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }

    // Load prior messages for context
    const { data: prior } = await admin
      .from("assistant_messages")
      .select("role,content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(40);

    // Persist user message
    await admin.from("assistant_messages").insert({
      thread_id: threadId, user_id: user.id, role: "user", content: message,
    });

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(prior ?? []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    // Tool loop
    for (let step = 0; step < 8; step++) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
          "X-Lovable-AIG-SDK": "edge-fetch",
        },
        body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: "auto" }),
      });
      if (!aiRes.ok) {
        const errText = await aiRes.text();
        if (aiRes.status === 429) return json({ error: "Rate limit exceeded. Please try again shortly.", threadId }, 429);
        if (aiRes.status === 402) return json({ error: "AI credits exhausted. Please add credits in workspace billing.", threadId }, 402);
        return json({ error: `AI error: ${errText}`, threadId }, 500);
      }
      const data = await aiRes.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) return json({ error: "No AI response", threadId }, 500);
      messages.push(msg);
      const toolCalls = msg.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          let parsed: any = {};
          try { parsed = JSON.parse(tc.function?.arguments ?? "{}"); } catch { /* */ }
          const result = await runTool(tc.function?.name ?? "", parsed);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }
      // Final answer
      const text = typeof msg.content === "string" ? msg.content : "";
      const { answer, suggestions } = parseFinal(text);
      await admin.from("assistant_messages").insert({
        thread_id: threadId, user_id: user.id, role: "assistant", content: answer, suggestions,
      });
      return json({ threadId, answer, suggestions });
    }
    return json({ error: "Tool loop exceeded", threadId }, 500);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
