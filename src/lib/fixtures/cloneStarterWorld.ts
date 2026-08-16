import starterWorldData from "./starterWorld.json";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import type { Database, EntryType } from "@/types/database";

export interface CloneStarterWorldResult {
  success: boolean;
  worldId?: string;
  worldName?: string;
  error?: string;
}

export async function cloneStarterWorld(userId: string): Promise<CloneStarterWorldResult> {
  if (!userId) {
    return {
      success: false,
      error: "Se requiere un usuario autenticado para forjar el mundo de ejemplo.",
    };
  }

  const supabase = createClient();

  try {
    // 1. Insertar el mundo en la tabla worlds
    const worldPayload: Database["public"]["Tables"]["worlds"]["Insert"] = {
      name: starterWorldData.name,
      description: starterWorldData.description,
      owner_id: userId,
    };

    const { data: newWorld, error: worldErr } = await supabase
      .from("worlds")
      .insert(worldPayload)
      .select()
      .single();

    if (worldErr || !newWorld) {
      return {
        success: false,
        error: "No se pudo crear el mundo de ejemplo en la base de datos.",
      };
    }

    const tempIdToUuidMap = new Map<string, string>();

    // 2. Insertar todas las entradas asociadas
    for (const item of starterWorldData.entries) {
      const entryPayload: Database["public"]["Tables"]["entries"]["Insert"] = {
        world_id: newWorld.id,
        type: item.type as EntryType,
        name: item.name,
        summary: item.summary || null,
        details: item.details || null,
        tags: item.tags || [],
        date_in_world: "date_in_world" in item ? item.date_in_world : null,
      };

      const { data: newEntry, error: entryErr } = await supabase
        .from("entries")
        .insert(entryPayload)
        .select("id")
        .single();

      if (!entryErr && newEntry) {
        tempIdToUuidMap.set(item.temp_id, newEntry.id);
      }
    }

    // 3. Insertar las relaciones bidireccionales entre las entradas
    const relationsToInsert: Array<Database["public"]["Tables"]["entry_relations"]["Insert"]> = [];

    for (const rel of starterWorldData.relations) {
      const fromId = tempIdToUuidMap.get(rel.from_temp_id);
      const toId = tempIdToUuidMap.get(rel.to_temp_id);

      if (fromId && toId) {
        relationsToInsert.push({
          world_id: newWorld.id,
          from_entry_id: fromId,
          to_entry_id: toId,
          relation_type: rel.relation_type,
          note: rel.note || null,
        });
      }
    }

    if (relationsToInsert.length > 0) {
      await supabase.from("entry_relations").insert(relationsToInsert);
    }

    // 4. Registrar evento en la analítica
    trackEvent("world_created", {
      world_id: newWorld.id,
      name: newWorld.name,
    });

    return {
      success: true,
      worldId: newWorld.id,
      worldName: newWorld.name,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    return {
      success: false,
      error: `Error al clonar el mundo de ejemplo: ${message}`,
    };
  }
}
