import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Authentication required.");

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!geminiKey || !supabaseUrl || !publishableKey) {
      throw new Error("The city assistant is not configured.");
    }

    const body = await request.json() as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!messages.length) throw new Error("A message is required.");

    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });

    const { data: events, error } = await supabase
      .from("events")
      .select("event_type,severity,title_en,title_sq,summary,location_name,source_count,status,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) throw error;

    const liveContext = (events ?? []).map((event) => {
      const ageMinutes = Math.round((Date.now() - new Date(event.created_at).getTime()) / 60000);
      return `- [${event.severity}] ${event.event_type} at ${event.location_name}, ${ageMinutes}m ago, ${event.status}, ${event.source_count} source(s): ${event.title_en}${event.summary ? ` - ${event.summary}` : ""}`;
    }).join("\n");

    const systemInstruction = `You are TiranaFlow's live city intelligence assistant for Tirana, Albania. Answer only from the active incidents below. Never invent incidents. Prioritize severity, recency, and reports confirmed by multiple sources. Use concise plain language and Albanian neighborhood names. If the data does not answer the question, say so. Never claim to dispatch emergency services.\n\nACTIVE INCIDENTS:\n${liveContext || "No active incidents right now."}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
          })),
          generationConfig: { temperature: 0.25, maxOutputTokens: 700 },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 180)}`);
    }

    const result = await response.json();
    const answer = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();
    if (!answer) throw new Error("Gemini returned no answer.");

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Assistant failed." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
