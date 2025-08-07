// src/app/api/analyse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { openai } from "@/lib/openai-client";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();
    if (!description) {
      return NextResponse.json({ error: "`description` is required." }, { status: 400 });
    }

    // 1. Load variables
    const { data: variables, error: varErr } = await supabase
      .from("variables")
      .select("name,weight");
    if (varErr) {
      return NextResponse.json({ error: "Error loading variables: " + varErr.message }, { status: 500 });
    }
    if (!variables || variables.length === 0) {
      return NextResponse.json({ error: "No variables found in Supabase." }, { status: 500 });
    }

    // 2. Load prompts
    const { data: prompts, error: prErr } = await supabase
      .from("prompts")
      .select("type,content")
      .order("id", { ascending: true });
    if (prErr) {
      return NextResponse.json({ error: "Error loading prompts: " + prErr.message }, { status: 500 });
    }
    console.log("PROMPTS LOADED:", prompts);
    if (!prompts || prompts.length < 2) {
      return NextResponse.json({ error: "Prompts table must contain both 'system' and 'user' entries." }, { status: 500 });
    }

    const systemPromptRow = prompts.find(p => p.type === "system");
    const userPromptRow   = prompts.find(p => p.type === "user");
    if (!systemPromptRow || !userPromptRow) {
      return NextResponse.json({ error: "Missing one of the prompt types (system/user)." }, { status: 500 });
    }
    const systemPrompt = systemPromptRow.content;
    const userTemplate = userPromptRow.content;

    // 3. Build variable list text
    const variableListText = variables
      .map(v => `- ${v.name} (weight: ${v.weight})`)
      .join("\n");

    // 4. Inject into user prompt
    const userPrompt = userTemplate
      .replace("{{variable_list}}", variableListText)
      .replace("{{description}}", description);

    // 5. Call OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt }
      ],
    });

    const raw = aiResponse.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response.");

    // 6. Parse JSON
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 502 });
    }

    // 7. Return structured result
    return NextResponse.json(result);

  } catch (err: any) {
    console.error("API /api/analyse error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
