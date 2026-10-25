/* Lecteur épuré : récupère une page web et n'en garde que les médias (images, GIF, vidéos) et les liens de navigation.
   Aucun script, bandeau de cookies ou publicité du site n'est jamais exécuté ni affiché. */
const AD_HOST = /(doubleclick|googlesyndication|googleadservices|adservice\.|adnxs|taboola|outbrain|criteo|scorecardresearch|googletagmanager|google-analytics|hotjar|quantserve|amazon-adsystem|pubmatic|rubiconproject|openx\.|smartadserver|adsrvr|cookiebot|onetrust|didomi|quantcast|axeptio|tarteaucitron|facebook\.net|connect\.facebook|\.ads\.|ads\.)/i;
const JUNK = /(logo|icon|sprite|avatar|favicon|emoji|banner|pixel|tracking|spacer|blank|loading|placeholder|\/ads?\/|advert|sponsor|badge|gravatar|share|social|arrow|close|menu|flag)/i;
export const isVideoUrl = u => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u || "");
export const isGifUrl = u => /\.gif(\?|#|$)/i.test(u || "");
export const isImageUrl = u => /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(u || "");
export const kindOf = u => (isVideoUrl(u) ? "video" : isGifUrl(u) ? "gif" : "image");

const attrs = str => { const o = {}; for (const m of str.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ""; return o; };
const dec = s => (s || "").replace(/&amp;/g, "&").replace(/&#0?38;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
const abs = (u, base) => { try { const x = new URL(dec(u).trim(), base); return /^https?:$/.test(x.protocol) ? x.href : null; } catch { return null; } };
const biggest = (set, base) => { let best = null, bw = -1; for (const part of set.split(",")) { const [u, d] = part.trim().split(/\s+/); const w = parseFloat(d) || 1; if (u && w > bw) { bw = w; best = u; } } return best && abs(best, base); };

export function extract(html, base) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  const title = dec((clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").replace(/\s+/g, " ").trim();
  let host = ""; try { host = new URL(base).hostname.replace(/^www\./, ""); } catch { /* ignoré */ }
  const same = u => { try { return new URL(u).hostname.replace(/^www\./, "") === host; } catch { return false; } };
  const media = [], seen = new Set();
  const push = m => {
    if (!m.src || seen.has(m.src)) return;
    let u; try { u = new URL(m.src); } catch { return; }
    if (AD_HOST.test(u.hostname)) return;
    if (m.kind !== "video" && (JUNK.test(u.pathname) || /\.svg$/i.test(u.pathname))) return;
    seen.add(m.src); media.push(m);
  };

  const mediaIn = (frag, link) => {
    const out = [];
    for (const v of frag.matchAll(/<video\b([^>]*)>([\s\S]*?)<\/video>|<video\b([^>]*)\/?>/gi)) {
      const a = attrs(v[1] ?? v[3] ?? ""), inner = v[2] || "";
      const srcs = [a.src, a["data-src"], ...[...inner.matchAll(/<source\b([^>]*)>/gi)].map(s => attrs(s[1]).src)].filter(Boolean).map(s => abs(s, base)).filter(Boolean);
      const src = srcs.find(isVideoUrl) || srcs[0];
      if (src) out.push({ kind: "video", src, poster: a.poster ? abs(a.poster, base) : null, alt: a.title || "" });
    }
    for (const i of frag.matchAll(/<img\b([^>]*)>/gi)) {
      const a = attrs(i[1]);
      const w = parseInt(a.width, 10), h = parseInt(a.height, 10);
      if ((w && w < 120) || (h && h < 120)) continue;
      const cand = (a.srcset && biggest(a.srcset, base)) || (a["data-srcset"] && biggest(a["data-srcset"], base)) ||
        [a["data-src"], a["data-lazy-src"], a["data-original"], a.src].filter(s => s && !/^data:/i.test(s)).map(s => abs(s, base)).find(Boolean);
      if (cand) out.push({ kind: kindOf(cand) === "gif" ? "gif" : "image", src: cand, alt: dec(a.alt || "") });
    }
    return out.map(m => ({ ...m, ...link }));
  };

  /* 1) vignettes dans des liens : le lien mène soit à la page de l'élément, soit au fichier en grand */
  const links = [], seenLink = new Set();
  let next = null;
  const noAnchors = clean.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_, at, inner) => {
    const a = attrs(at), href = a.href ? abs(a.href, base) : null;
    const text = dec(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const found = mediaIn(inner, {});
    if (href && (/\bnext\b/i.test(a.rel || "") || /^(suivant|next|page suivante|plus ancien|older|›|»)/i.test(text))) next = next || href;
    if (href && isImageUrl(href) && !isVideoUrl(href) && found.length) found.forEach(m => push({ ...m, src: href, thumb: m.src }));
    else if (href && isVideoUrl(href)) push({ kind: "video", src: href, poster: found[0]?.src || null, alt: text });
    else if (found.length) found.forEach(m => push({ ...m, page: href && same(href) ? href : null, alt: m.alt || text }));
    else if (href && isImageUrl(href)) push({ kind: kindOf(href), src: href, alt: text });
    if (href && same(href) && !isImageUrl(href) && !isVideoUrl(href) && !/#/.test(href) && !seenLink.has(href) && (text.length > 2 || found.length) && links.length < 80) { seenLink.add(href); links.push({ href, text: text.slice(0, 60) }); }
    return " ";
  });

  /* 2) médias hors liens */
  mediaIn(noAnchors, {}).forEach(push);

  /* 3) balises sociales (souvent la meilleure image de la page) */
  for (const m of clean.matchAll(/<meta\b([^>]*)>/gi)) {
    const a = attrs(m[1]), key = (a.property || a.name || "").toLowerCase(), v = a.content && abs(a.content, base);
    if (!v) continue;
    if (/^og:video(:url|:secure_url)?$|twitter:player:stream$/.test(key)) push({ kind: "video", src: v, alt: title });
    else if (/^(og:image(:url|:secure_url)?|twitter:image)$/.test(key)) push({ kind: kindOf(v) === "gif" ? "gif" : "image", src: v, alt: title });
  }
  const rel = clean.match(/<link\b[^>]*rel=["']next["'][^>]*>/i);
  if (!next && rel) { const h = attrs(rel[0]).href; next = h && abs(h, base); }
  return { title, media, links, next };
}

/* ───────── réseau (Tauri : plugin HTTP, sans restriction CORS) ───────── */
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
async function getFetch() {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) return (await import("@tauri-apps/plugin-http")).fetch;
  return globalThis.fetch.bind(globalThis);
}
export async function fetchPage(url) {
  const f = await getFetch();
  const r = await f(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" } });
  if (!r.ok) throw new Error(`Le site a répondu ${r.status}.`);
  const finalUrl = r.url || url;
  const ct = r.headers.get("content-type") || "";
  if (/^(image|video)\//.test(ct)) return { url: finalUrl, title: finalUrl, media: [{ kind: kindOf(finalUrl), src: finalUrl }], links: [], next: null };
  return { url: finalUrl, ...extract(await r.text(), finalUrl) };
}
export async function fetchBlob(url) {
  const f = await getFetch();
  const r = await f(url, { headers: { "User-Agent": UA, Accept: "*/*" } });
  if (!r.ok) throw new Error(`Téléchargement impossible (${r.status}).`);
  return await r.blob();
}
export const toDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
export const LIMITS = { image: 8 * 1024 * 1024, gif: 8 * 1024 * 1024, video: 12 * 1024 * 1024 };
