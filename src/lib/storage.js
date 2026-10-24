/* Fichiers : Tauri (dialogues natifs + fs) avec repli navigateur pour le développement */
const tauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function download(name, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function saveText(defaultName, text, filters, existingPath) {
  if (tauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = existingPath || await save({ defaultPath: defaultName, filters });
    if (!path) return null;
    await writeTextFile(path, text);
    return path;
  }
  download(defaultName, new Blob([text], { type: "text/plain;charset=utf-8" }));
  return defaultName;
}

export async function saveBytes(defaultName, bytes, filters) {
  if (tauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({ defaultPath: defaultName, filters });
    if (!path) return null;
    await writeFile(path, bytes);
    return path;
  }
  download(defaultName, new Blob([bytes]));
  return defaultName;
}

export async function openText(filters) {
  if (tauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await open({ multiple: false, filters });
    if (!path) return null;
    return { path, name: String(path).split("/").pop(), text: await readTextFile(path) };
  }
  return new Promise(res => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = filters.flatMap(f => f.extensions.map(e => "." + e)).join(",");
    inp.onchange = async () => { const f = inp.files[0]; res(f ? { path: null, name: f.name, text: await f.text() } : null); };
    inp.click();
  });
}

const AUTO = "autosave.cinedesk";
export async function autosave(json) {
  try {
    if (tauri()) {
      const { writeTextFile, mkdir, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true }).catch(() => {});
      await writeTextFile(AUTO, json, { baseDir: BaseDirectory.AppData });
    } else localStorage.setItem(AUTO, json);
  } catch (e) { console.warn("autosave", e); }
}
export async function loadAutosave() {
  try {
    if (tauri()) {
      const { readTextFile, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      return (await exists(AUTO, { baseDir: BaseDirectory.AppData })) ? await readTextFile(AUTO, { baseDir: BaseDirectory.AppData }) : null;
    }
    return localStorage.getItem(AUTO);
  } catch { return null; }
}

/* Ouvre un fichier quelconque (PDF, Word, texte, projet…) et renvoie ses octets */
export async function openFile(filters) {
  if (tauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readFile } = await import("@tauri-apps/plugin-fs");
    const path = await open({ multiple: false, filters });
    if (!path) return null;
    return { path, name: String(path).split("/").pop(), bytes: await readFile(path) };
  }
  return new Promise(res => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = filters.flatMap(f => f.extensions.map(e => "." + e)).join(",");
    inp.onchange = async () => { const f = inp.files[0]; res(f ? { path: null, name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : null); };
    inp.click();
  });
}
