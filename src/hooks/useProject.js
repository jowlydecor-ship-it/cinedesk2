import { useRef, useState, useMemo, useCallback } from "react";

/* État du projet avec historique annuler/rétablir (frappes rapprochées regroupées) */
export function useProject(initial) {
  const [state, setState] = useState(() => ({ past: [], present: initial, future: [] }));
  const ref = useRef(state);
  const saved = useRef(initial);
  const last = useRef({ key: null, t: 0 });
  const apply = s => { ref.current = s; setState(s); };

  const setters = useMemo(() => {
    const make = key => upd => {
      const s = ref.current, cur = s.present[key];
      const next = typeof upd === "function" ? upd(cur) : upd;
      if (next === cur) return;
      const now = Date.now();
      const merge = last.current.key === key && now - last.current.t < 800;
      last.current = { key, t: now };
      apply({ past: merge ? s.past : [...s.past.slice(-99), s.present], present: { ...s.present, [key]: next }, future: [] });
    };
    return { lines: make("lines"), notes: make("notes"), links: make("links"), panels: make("panels"), meta: make("meta"), desk: make("desk"), gridNotes: make("gridNotes") };
  }, []);

  const undo = useCallback(() => {
    const s = ref.current; if (!s.past.length) return;
    last.current = { key: null, t: 0 };
    apply({ past: s.past.slice(0, -1), present: s.past.at(-1), future: [s.present, ...s.future] });
  }, []);
  const redo = useCallback(() => {
    const s = ref.current; if (!s.future.length) return;
    last.current = { key: null, t: 0 };
    apply({ past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) });
  }, []);
  const load = useCallback(p => { saved.current = p; last.current = { key: null, t: 0 }; apply({ past: [], present: p, future: [] }); }, []);
  const markSaved = useCallback(() => { saved.current = ref.current.present; setState(s => ({ ...s })); }, []);

  return {
    project: state.present, set: setters, undo, redo, load, markSaved,
    canUndo: state.past.length > 0, canRedo: state.future.length > 0,
    dirty: state.present !== saved.current,
  };
}
