import { X, Check } from "lucide-react";
import { THEMES, useTheme } from "../theme";

/* Réglages : choix du thème visuel (enregistré sur cet ordinateur). */
export default function Settings({ onClose }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-[640px] overflow-y-auto clay-card p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-1 flex items-center">
          <h2 className="text-lg font-extrabold text-ink">Réglages</h2>
          <button onClick={onClose} className="ml-auto rounded-full p-1.5 text-ink-soft hover:clay-chip"><X size={16} /></button>
        </div>
        <p className="mb-4 text-xs text-ink-soft">Apparence du logiciel. Le thème « Stop motion » est celui par défaut. Toute l'application utilise la police Helvetica.</p>
        <div className="space-y-3">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} className={`flex w-full items-center gap-4 p-4 text-left ${theme === t.id ? "clay-solid clay-peach" : "clay-chip !rounded-3xl"}`}>
              <span className="flex shrink-0 -space-x-2">
                {t.swatch.map((c, i) => <span key={i} className="h-7 w-7 rounded-full border-2 border-white/80" style={{ background: c, boxShadow: "0 2px 4px rgba(0,0,0,.25)" }} />)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">{t.label}</span>
                <span className="block text-xs font-medium opacity-80">{t.desc}</span>
              </span>
              {theme === t.id && <Check size={18} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
