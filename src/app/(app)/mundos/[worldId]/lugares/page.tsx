"use client";

import React from "react";
import { useParams } from "next/navigation";
import { EntriesSectionView } from "@/components/entries/EntriesSectionView";

export default function LugaresPage() {
  const params = useParams();
  const worldId = params?.worldId as string;

  return <EntriesSectionView worldId={worldId} entryType="lugar" />;
}
