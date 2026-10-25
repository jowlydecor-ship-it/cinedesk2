import test from "node:test";
import assert from "node:assert/strict";
import { extract, kindOf } from "../src/lib/reader.js";

const HTML = `<!doctype html><html><head><title>Fisheye &amp; co – Eye Candy</title>
<meta property="og:image" content="/img/cover.jpg"><link rel="next" href="/page/2">
<script>window.adsbygoogle = []; document.write('<img src="https://x.com/evil.jpg">')</script>
<style>.cookie{display:block}</style></head><body>
<div id="cookie-banner" class="cookie">Nous utilisons des cookies <button>Accepter</button></div>
<img src="https://securepubads.g.doubleclick.net/pixel.gif" width="1" height="1">
<img src="/assets/logo.png" width="200" height="60">
<a href="/technique/fisheye"><img data-src="/media/fisheye-1.jpg" src="data:image/gif;base64,R0lGOD" alt="Fisheye" width="400" height="300"></a>
<a href="/technique/dolly"><img srcset="/m/dolly-small.jpg 300w, /m/dolly-large.jpg 900w" alt="Dolly"></a>
<a href="/media/full-size.jpg"><img src="/media/thumb.jpg" width="300" height="200"></a>
<video poster="/media/p.jpg" muted loop><source src="/media/clip.mp4" type="video/mp4"></video>
<img src="/media/reaction.gif" width="320" height="240">
<img src="/icons/play-icon.png" width="300" height="300">
<img src="https://ads.example.com/banner.jpg" width="728" height="90">
<a href="/page/2">Suivant ›</a><a href="https://elsewhere.com/x">Dehors</a>
</body></html>`;

test("lecteur : garde les médias utiles, jette pubs, logos, pixels et scripts", () => {
  const r = extract(HTML, "https://eyecannndy.com/technique/fisheye");
  const srcs = r.media.map(m => m.src);
  assert.equal(r.title, "Fisheye & co – Eye Candy");
  assert.ok(srcs.includes("https://eyecannndy.com/media/fisheye-1.jpg"), "image en chargement différé (data-src)");
  assert.ok(srcs.includes("https://eyecannndy.com/m/dolly-large.jpg"), "plus grande image du srcset");
  assert.ok(srcs.includes("https://eyecannndy.com/media/full-size.jpg"), "le lien vers le fichier en grand l'emporte sur la vignette");
  assert.ok(srcs.includes("https://eyecannndy.com/media/clip.mp4"));
  assert.ok(srcs.includes("https://eyecannndy.com/media/reaction.gif"));
  assert.ok(srcs.includes("https://eyecannndy.com/img/cover.jpg"), "balise og:image");
  for (const bad of ["doubleclick", "logo", "play-icon", "ads.example", "evil"]) assert.ok(!srcs.some(s => s.includes(bad)), bad);
  assert.ok(!r.media.some(m => /cookie/i.test(JSON.stringify(m))));
});

test("lecteur : types, pages liées et page suivante", () => {
  const r = extract(HTML, "https://eyecannndy.com/technique/fisheye");
  assert.equal(r.media.find(m => m.src.endsWith("clip.mp4")).kind, "video");
  assert.equal(r.media.find(m => m.src.endsWith("clip.mp4")).poster, "https://eyecannndy.com/media/p.jpg");
  assert.equal(r.media.find(m => m.src.endsWith("reaction.gif")).kind, "gif");
  assert.equal(r.media.find(m => m.src.endsWith("fisheye-1.jpg")).page, "https://eyecannndy.com/technique/fisheye");
  assert.equal(r.next, "https://eyecannndy.com/page/2");
  assert.ok(r.links.some(l => l.href.endsWith("/technique/dolly")));
  assert.ok(!r.links.some(l => l.href.includes("elsewhere")));
  assert.equal(kindOf("a.mp4?x=1"), "video");
});
