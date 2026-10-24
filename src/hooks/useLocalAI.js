import { useEffect, useRef, useState } from "react";
import { DEFAULT_BASE, localModels, streamChat } from "../lib/llm";

/* IA locale optionnelle (Ollama / llama-server) : détection du modèle + réponse en streaming */
export function useLocalAI() {
  const [model, setModel] = useState(null);
  const [out, setOut] = useState({ title: "", text: "", busy: false, err: "" });
  const abort = useRef(null);
  useEffect(() => { localModels(DEFAULT_BASE).then(m => setModel(m[0] || null)).catch(() => setModel(null)); }, []);
  const run = async (title, messages) => {
    abort.current?.abort();
    abort.current = new AbortController();
    setOut({ title, text: "", busy: true, err: "" });
    try {
      for await (const tok of streamChat({ model, messages, signal: abort.current.signal })) setOut(o => ({ ...o, text: o.text + tok }));
      setOut(o => ({ ...o, busy: false }));
    } catch (e) { if (e.name !== "AbortError") setOut(o => ({ ...o, busy: false, err: e.message })); }
  };
  return { model, out, run };
}
