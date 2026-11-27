// src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MESSAGE_MAX, dbRefusal, isEmail, isUuid, oneOf, smallObject, text } from "@/lib/validate";

const CONTEXT_TYPES = ["direct", "collab", "artwork_inquiry"] as const;

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

    if (error) { console.error("Conversations GET error:", error.message); return NextResponse.json({ error: "Could not load your conversations." }, { status: 500 }); }

    // Enrich with the other person's profile and the unread count.
    // Two queries for the whole list (it used to be two per conversation).
    const list = convos || [];
    const otherOf = (c: any) => (c.participant_a === user.id ? c.participant_b : c.participant_a);
    const otherIds = Array.from(new Set(list.map(otherOf).filter(Boolean)));
    const ids = list.map(c => c.id);
    const [{ data: profs }, { data: unreadRows }, { data: blockRows }] = await Promise.all([
      otherIds.length
        ? supabase.from("profiles").select("id, full_name, username, avatar_url, role").in("id", otherIds)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase.from("messages")
            .select("conversation_id, read_by_a, read_by_b, sender_id")
            .in("conversation_id", ids)
            .or("read_by_a.eq.false,read_by_b.eq.false")
            .neq("sender_id", user.id)
            .limit(5000)
        : Promise.resolve({ data: [] as any[] }),
      // People I blocked (RLS only shows my own blocks).
      otherIds.length
        ? supabase.from("user_blocks").select("blocked_id").in("blocked_id", otherIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const blocked = new Set((blockRows || []).map((b: any) => b.blocked_id));
    const profById = new Map((profs || []).map((p: any) => [p.id, p]));
    const isAById = new Map(list.map(c => [c.id, c.participant_a === user.id]));
    const unreadById = new Map<string, number>();
    for (const m of unreadRows || []) {
      const isA = isAById.get(m.conversation_id);
      if (isA ? m.read_by_a === false : m.read_by_b === false) {
        unreadById.set(m.conversation_id, (unreadById.get(m.conversation_id) || 0) + 1);
      }
    }
    const enriched = list.map(c => ({
      ...c,
      other_profile: profById.get(otherOf(c)) || null,
      unread_count: unreadById.get(c.id) || 0,
      blocked_by_me: blocked.has(otherOf(c)),
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

    const recipient_id = body?.recipient_id;
    if (!isUuid(recipient_id)) return NextResponse.json({ error: "recipient_id required" }, { status: 400 });
    // Shape checks only: the text itself is saved exactly as typed (see lib/validate).
    const context_type = oneOf(body.context_type, CONTEXT_TYPES, "direct");
    const context_id = text(body.context_id, 100);
    const context_title = text(body.context_title, 200);
    const context_meta = smallObject(body.context_meta, 4000);
    const initial_message = text(body.initial_message, MESSAGE_MAX);
    const guest_name = text(body.guest_name, 100);
    const guest_email = text(body.guest_email, 254);
    const tag = typeof body.template_key === "string" && /^[a-z_]{1,32}$/.test(body.template_key) ? body.template_key : null;

    if (!initial_message) return NextResponse.json({ error: "Message body required" }, { status: 400 });
    if (user && recipient_id === user.id) return NextResponse.json({ error: "You can't message yourself." }, { status: 400 });

    const senderId = user?.id || null;

    // Visitors without an account go through a database function that checks
    // the input and creates the conversation, message and notification.
    if (!senderId) {
      if (!guest_name || !isEmail(guest_email)) {
        return NextResponse.json({ error: "Name and email required" }, { status: 400 });
      }
      const { data: convoId, error: guestErr } = await supabase.rpc("start_guest_conversation", {
        p_recipient_id: recipient_id,
        p_guest_name: guest_name,
        p_guest_email: guest_email,
        p_body: initial_message,
        p_context_type: context_type,
        p_context_id: context_id || null,
        p_context_title: context_title || null,
        p_context_meta: context_meta || null,
      });
      if (guestErr || !convoId) {
        const tooMany = guestErr?.message?.includes("Too many");
        return NextResponse.json(
          { error: tooMany ? "Too many messages. Please try again later." : "Could not send your message." },
          { status: tooMany ? 429 : 400 }
        );
      }
      return NextResponse.json({ conversation_id: convoId });
    }

    // Check if conversation already exists between these two
    if (senderId) {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id, participant_a")
        .or(
          `and(participant_a.eq.${senderId},participant_b.eq.${recipient_id}),and(participant_a.eq.${recipient_id},participant_b.eq.${senderId})`
        )
        .eq("context_type", context_type)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // The sender has read it; the other person hasn't.
        const senderIsA = existing.participant_a === senderId;
        const { error: sendErr } = await supabase.from("messages").insert({
          conversation_id: existing.id,
          sender_id: senderId,
          body: initial_message,
          template_key: tag,
          read_by_a: senderIsA,
          read_by_b: !senderIsA,
        });
        const refused = dbRefusal(sendErr);
        if (refused) return NextResponse.json({ error: refused.error }, { status: refused.status });
        if (sendErr) return NextResponse.json({ error: "Could not send your message." }, { status: 500 });
        await supabase.from("conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: initial_message.slice(0, 120),
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
        last_message_preview: initial_message.slice(0, 120),
      })
      .select()
      .single();

    const refused = dbRefusal(convoErr);
    if (refused) return NextResponse.json({ error: refused.error }, { status: refused.status });
    if (convoErr || !convo) return NextResponse.json({ error: "Could not start the conversation." }, { status: 500 });

    await supabase.from("messages").insert({
      conversation_id: convo.id,
      sender_id: senderId,
      guest_name: guest_name || null,
      guest_email: guest_email || null,
      body: initial_message,
      template_key: tag,
      read_by_a: true,
      read_by_b: false,
    });

    // Notify recipient
    await supabase.from("notifications").insert({
      user_id: recipient_id,
      type: "message",
      title: senderId ? "New message" : `Message from ${guest_name || "a visitor"}`,
      body: initial_message.slice(0, 80),
      data: { conversation_id: convo.id },
    });

    return NextResponse.json({ conversation_id: convo.id });
  } catch (e) {
    console.error("Conversations POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
