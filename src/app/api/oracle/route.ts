import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const FREE_MONTHLY_LIMIT = 30;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Calcular el inicio del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Contar los mensajes de usuario realizados este mes
    const { data: userWorlds } = await supabase
      .from("worlds")
      .select("id")
      .eq("owner_id", user.id);

    const worldIds = userWorlds?.map((w) => w.id) || [];

    if (worldIds.length === 0) {
      return NextResponse.json({ count: 0, limit: FREE_MONTHLY_LIMIT });
    }

    // Obtener las conversaciones de los mundos del usuario
    const { data: conversations } = await supabase
      .from("oracle_conversations")
      .select("id")
      .in("world_id", worldIds);

    const convIds = conversations?.map((c) => c.id) || [];

    if (convIds.length === 0) {
      return NextResponse.json({ count: 0, limit: FREE_MONTHLY_LIMIT });
    }

    const { count, error: countError } = await supabase
      .from("oracle_messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("role", "user")
      .gte("created_at", startOfMonth);

    if (countError) {
      return NextResponse.json({ count: 0, limit: FREE_MONTHLY_LIMIT });
    }

    return NextResponse.json({
      count: count || 0,
      limit: FREE_MONTHLY_LIMIT,
    });
  } catch {
    return NextResponse.json(
      { error: "Error al consultar la cuota mensual" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para consultar al Oráculo." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { worldId, message, conversationId } = body;

    if (!worldId || !message?.trim()) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (worldId o message)." },
        { status: 400 }
      );
    }

    // 1. Validar que el usuario es dueño del mundo
    const { data: world, error: worldError } = await supabase
      .from("worlds")
      .select("*")
      .eq("id", worldId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (worldError || !world) {
      return NextResponse.json(
        { error: "No tienes permiso para consultar el códice de este mundo." },
        { status: 403 }
      );
    }

    // 2. Verificar la cuota mensual de consultas
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: userWorlds } = await supabase
      .from("worlds")
      .select("id")
      .eq("owner_id", user.id);

    const worldIds = userWorlds?.map((w) => w.id) || [];
    const { data: allUserConvs } = await supabase
      .from("oracle_conversations")
      .select("id")
      .in("world_id", worldIds);

    const convIds = allUserConvs?.map((c) => c.id) || [];

    let currentUsageCount = 0;
    if (convIds.length > 0) {
      const { count } = await supabase
        .from("oracle_messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .eq("role", "user")
        .gte("created_at", startOfMonth);

      currentUsageCount = count || 0;
    }

    if (currentUsageCount >= FREE_MONTHLY_LIMIT) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite mensual de ${FREE_MONTHLY_LIMIT} consultas del plan Escriba (Gratuito). La cuota se restablecerá el primer día del próximo mes.`,
          usage: { count: currentUsageCount, limit: FREE_MONTHLY_LIMIT },
        },
        { status: 429 }
      );
    }

    // 3. Obtener o crear la conversación activa
    let activeConvId = conversationId;

    if (!activeConvId) {
      // Buscar la última conversación o crear una nueva
      const { data: existingConv } = await supabase
        .from("oracle_conversations")
        .select("id")
        .eq("world_id", worldId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        activeConvId = existingConv.id;
      } else {
        const { data: newConv, error: newConvErr } = await supabase
          .from("oracle_conversations")
          .insert({ world_id: worldId })
          .select("id")
          .single();

        if (newConvErr || !newConv) {
          return NextResponse.json(
            { error: "No se pudo iniciar el santuario de conversación." },
            { status: 500 }
          );
        }
        activeConvId = newConv.id;
      }
    }

    // 4. Obtener las entradas del mundo para ensamblar el canon
    const { data: entries } = await supabase
      .from("entries")
      .select("type, name, summary, date_in_world, tags")
      .eq("world_id", worldId)
      .order("name", { ascending: true });

    // 5. Obtener relaciones entre entradas
    const { data: relations } = await supabase
      .from("entry_relations")
      .select("relation_type, note, from_entry_id, to_entry_id")
      .eq("world_id", worldId);

    // 6. Ensamblar el contexto del mundo para el bloque del sistema
    const entriesSummary = (entries || [])
      .map((e) => {
        const datePart = e.date_in_world ? ` [Era/Fecha: ${e.date_in_world}]` : "";
        const tagsPart = e.tags && e.tags.length > 0 ? ` (Tags: ${e.tags.join(", ")})` : "";
        const summaryPart = e.summary ? `: ${e.summary}` : "";
        return `- [${e.type.toUpperCase()}] ${e.name}${datePart}${tagsPart}${summaryPart}`;
      })
      .join("\n");

    const worldContextText = `
# CANON SAGRADO DEL MUNDO: «${world.name}»
Premisa del universo: ${world.description || "Sin descripción anotada."}

## ENTRADAS SELLADAS EN EL CÓDICE (${entries?.length || 0} registros):
${entriesSummary || "Aún no se han sellado entradas en este mundo."}

## TOTAL DE RELACIONES VINCULADAS: ${relations?.length || 0} vínculos registrados.
`.trim();

    // 7. Cargar el historial previo de mensajes de la conversación
    const { data: previousMessages } = await supabase
      .from("oracle_messages")
      .select("role, content, created_at")
      .eq("conversation_id", activeConvId)
      .order("created_at", { ascending: true });

    const formattedHistory: Anthropic.MessageParam[] = (previousMessages || []).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    // Agregar el mensaje actual del usuario
    formattedHistory.push({
      role: "user",
      content: message.trim(),
    });

    // 8. Llamar a la API de Anthropic con Prompt Caching
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "La clave de conexión con el Oráculo (ANTHROPIC_API_KEY) no está configurada en las variables de entorno del servidor.",
        },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPromptText = `
Eres el Oráculo de Códice, un ancestral archivero y consejero supremo de worldbuilding integrado en este grimorio digital.
Tu deber es asistir al escriba a expandir, conectar, profundizar y validar la coherencia del universo que está forjando.

INSTRUCCIONES CLAVE:
1. Responde SIEMPRE en español con un tono culto, solemne y evocador, pero DIRECTO y CONCISO (sin introducciones vacías ni halagos excesivos).
2. Conoce y respeta estrictamente el CANON SAGRADO del mundo proporcionado en el contexto. No contradigas lo que el escriba ya ha sellado.
3. Si el escriba te pide ideas, ofrece propuestas fértiles, inspiradoras y conectadas a los elementos ya existentes (facciones, personajes, magia o lugares).
4. Si detectas una contradicción lógica o temporal con respecto a las entradas selladas, señálala con delicadeza y propone cómo armonizarla.
5. Mantén las respuestas estructuradas y fáciles de leer.
`.trim();

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPromptText,
        },
        {
          type: "text",
          text: worldContextText,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: formattedHistory,
    });

    // Extraer texto de la respuesta
    const assistantContentBlock = response.content[0];
    const assistantText =
      assistantContentBlock?.type === "text"
        ? assistantContentBlock.text
        : "El Oráculo ha respondido en visiones ininteligibles.";

    // 9. Guardar los mensajes en Supabase
    await supabase.from("oracle_messages").insert([
      {
        conversation_id: activeConvId,
        role: "user",
        content: message.trim(),
      },
      {
        conversation_id: activeConvId,
        role: "assistant",
        content: assistantText,
      },
    ]);

    return NextResponse.json({
      message: assistantText,
      conversationId: activeConvId,
      usage: {
        count: currentUsageCount + 1,
        limit: FREE_MONTHLY_LIMIT,
      },
    });
  } catch (err: unknown) {
    console.error("Error en /api/oracle:", err);
    return NextResponse.json(
      {
        error:
          "El santuario del Oráculo no pudo responder a tu consulta. Por favor, intenta de nuevo.",
      },
      { status: 500 }
    );
  }
}
