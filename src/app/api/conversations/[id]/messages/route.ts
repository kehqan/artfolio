// src/app/api/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversationId = params.id;

    // Verify access
    const { data: convo } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .single();

    if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    // Fetch messages
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    // Mark unread messages as read
    const isA = convo.participant_a === user.id;
    await supabase
      .from("messages")
      .update({ [isA ? "read_by_a" : "read_by_b"]: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id);

    return NextResponse.json({ messages: messages || [], conversation: convo });
  } catch (e) {
    console.error("Messages GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversationId = params.id;
    const { body: msgBody, template_key } = await request.json();

    if (!msgBody?.trim()) return NextResponse.json({ error: "Message body required" }, { status: 400 });

    // Verify access & get convo
    const { data: convo } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .single();

    if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const isA = convo.participant_a === user.id;

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: msgBody.trim(),
        template_key: template_key || null,
        read_by_a: isA ? true : false,
        read_by_b: isA ? false : true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update conversation preview
    await supabase.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: msgBody.trim().slice(0, 120),
    }).eq("id", conversationId);

    // Notify the other participant
    const recipientId = isA ? convo.participant_b : convo.participant_a;
    if (recipientId) {
      await supabase.from("notifications").insert({
        user_id: recipientId,
        type: "message",
        title: "New message",
        body: msgBody.trim().slice(0, 80),
        data: { conversation_id: conversationId },
      });
    }

    return NextResponse.json({ message });
  } catch (e) {
    console.error("Messages POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
