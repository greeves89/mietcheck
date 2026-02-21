"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { UtilityBill } from "@/lib/types";

export function useBills() {
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getBills();
      setBills(data);
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { bills, isLoading, error, reload: load };
}

export function useBill(id: number) {
  const [bill, setBill] = useState<UtilityBill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getBill(id);
      setBill(data);
    } catch (e: any) {
      setError(e.message || "Fehler beim Laden");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  return { bill, isLoading, error, reload: load };
}
