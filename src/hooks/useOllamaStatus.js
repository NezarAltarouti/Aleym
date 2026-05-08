import { useState, useEffect, useCallback } from "react";
import ollama from "../services/OllamaService2";


/**
 * useOllamaStatus — global hook for checking Ollama availability.
 *
 * Runs healthCheck once on mount. Exposes a `recheck` function so UI
 * can re-verify after the user installs Ollama or pulls the model
 * without forcing a page reload.
 *
 * Status values:
 *   "checking"  — initial probe in progress
 *   "available" — Ollama reachable AND required model is installed
 *   "no-ollama" — cannot reach Ollama at all (not installed / not running)
 *   "no-model"  — Ollama is running but the configured model is missing
 */
export default function useOllamaStatus() {
  const [status, setStatus] = useState("checking");
  const [details, setDetails] = useState(null);

  const check = useCallback(async () => {
    setStatus("checking");
    const result = await ollama.healthCheck();
    setDetails(result);

    if (!result.ok) {
      setStatus("no-ollama");
    } else if (!result.hasModel) {
      setStatus("no-model");
    } else {
      setStatus("available");
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { status, details, recheck: check };
}
