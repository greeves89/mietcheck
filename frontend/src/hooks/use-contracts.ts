"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { RentalContract } from "@/lib/types";

export function useContracts() {
  const [contracts, setContracts] = useState<RentalContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getContracts();
      setContracts(data);
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { contracts, isLoading, error, reload: load };
}
