// src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: convos, error } = await supabase
      .from("conversations")
      .select("*")  // includes context_meta if the column exists
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich with other participant profile + unread count
    const enriched = await Promise.all((convos || []).map(async (c) => {
      const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
      let otherProfile = null;
      if (otherId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, role")
          .eq("id", otherId)
          .single();
        otherProfile = prof;
      }

      // Unread count for this user
      const isA = c.participant_a === user.id;
      const { count: unread } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .eq(isA ? "read_by_a" : "read_by_b", false)
        .neq("sender_id", user.id);

      return {
        ...c,
        other_profile: otherProfile,
        unread_count: unread || 0,
      };
    }));

    return NextResponse.json({ conversations: enriched });
  } catch (e) {
    console.error("Conversations GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await request.json();

    const {
      recipient_id,
      context_type = "direct",
      context_id,
      context_title,
      context_meta,       // ← now included
      initial_message,
      guest_name,
      guest_email,
    } = body;

    if (!recipient_id) return NextResponse.json({ error: "recipient_id required" }, { status: 400 });
    if (!initial_message?.trim()) return NextResponse.json({ error: "Message body required" }, { status: 400 });

    const senderId = user?.id || null;

    // Check if conversation already exists between these two
    if (senderId) {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_a.eq.${senderId},participant_b.eq.${recipient_id}),and(participant_a.eq.${recipient_id},participant_b.eq.${senderId})`
        )
        .eq("context_type", context_type)
        .maybeSingle();

      if (existing) {
        await supabase.from("messages").insert({
          conversation_id: existing.id,
          sender_id: senderId,
          body: initial_message.trim(),
          read_by_a: true,
          read_by_b: false,
        });
        await supabase.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: initial_message.trim().slice(0, 120),
        }).eq("id", existing.id);

        return NextResponse.json({ conversation_id: existing.id });
      }
    }

    // Create new conversation (with context_meta)
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({
        participant_a: senderId || null,
        participant_b: recipient_id,
        context_type,
        context_id: context_id || null,
        context_title: context_title || null,
        context_meta: context_meta || null,   // ← stored
        guest_name: guest_name || null,
        guest_email: guest_email || null,
        last_message_at: new Date().toISOString(),
        last_message_preview: initial_message.trim().slice(0, 120),
      })
      .select()
      .single();

    if (convoErr || !convo) return NextResponse.json({ error: convoErr?.message || "Failed" }, { status: 500 });

    await supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: senderId,
      guest_name: guest_name || null,
      guest_email: guest_email || null,
      body: initial_message.trim(),
      read_by_a: true,
      read_by_b: false,
    });

    // Notify recipient
    await supabase.from("notifications").insert({
      user_id: recipient_id,
      type: "message",
      title: senderId ? "New message" : `Message from ${guest_name || "a visitor"}`,
      body: initial_message.trim().slice(0, 80),
      data: { conversation_id: convo.id },
    });

    return NextResponse.json({ conversation_id: convo.id });
  } catch (e) {
    console.error("Conversations POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
