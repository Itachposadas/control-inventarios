// src/hooks/useSystemHealth.js
import { useEffect, useState, useRef } from "react";
import { API_URL } from "../api/client";

/**
 * Hook que consulta /api/health del backend cada 20 segundos.
 * - online:   Flask responde y la BD está conectada
 * - degraded: Flask responde pero la BD no
 * - offline:  Flask no responde
 */

const HEALTH_URL = `${API_URL}/health`;
const POLL_INTERVAL = 20_000; // 20 segundos

async function checkHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    // /api/health responde 503 + { db: "disconnected" } si falla la BD
    const data = await res.json().catch(() => null);
    if (data?.db === "disconnected") return { status: "degraded" };
    if (!res.ok) throw new Error("bad status");
    return { status: "online" };
  } finally {
    clearTimeout(timeout);
  }
}

export function useSystemHealth() {
  const [status, setStatus] = useState("checking");
  const [lastCheck, setLastCheck] = useState(null);
  const mountedRef = useRef(true);

  const check = async () => {
    try {
      const result = await checkHealth();
      if (!mountedRef.current) return;
      setStatus(result.status || "online");
      setLastCheck(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus("offline");
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    check(); // primer chequeo inmediato

    const interval = setInterval(check, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return { status, lastCheck, recheck: check };
}