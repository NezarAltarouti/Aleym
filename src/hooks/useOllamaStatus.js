import { useState, useEffect, useCallback } from "react";
import ollama from "../services/OllamaService2";

/**
 * useOllamaStatus — global hook for checking Ollama availability.
 *
 * Status values:
 *   "checking"  — initial probe in progress
 *   "available" — Ollama reachable AND at least one model is installed
 *   "no-ollama" — cannot reach Ollama at all (not installed / not running)
 *   "no-model"  — Ollama is running but no models are installed
 */
export default function useOllamaStatus() {
  const [status, setStatus] = useState("checking");
  const [details, setDetails] = useState(null);
  const [models, setModels] = useState([]);

  const check = useCallback(async () => {
    setStatus("checking");
    const result = await ollama.healthCheck();
    setDetails(result);
    setModels(result.models || []);

    if (!result.ok) {
      setStatus("no-ollama");
    } else if (!result.hasAnyModel) {
      setStatus("no-model");
    } else {
      setStatus("available");
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { status, details, models, recheck: check };
}
