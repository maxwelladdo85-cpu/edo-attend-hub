import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const resolveTeacherEmail = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        teacherId: z.string().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("teacher_id", data.teacherId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile) throw new Error("Teacher ID not found");

    const { data: userResp, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    if (userErr || !userResp?.user?.email)
      throw new Error("Unable to locate teacher account");

    return { email: userResp.user.email };
  });
