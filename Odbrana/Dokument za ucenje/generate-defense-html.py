from __future__ import annotations

import html
import re
from html.parser import HTMLParser
from pathlib import Path

import markdown
from markdown.extensions.toc import slugify_unicode


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "PRIPREMA-ZA-ODBRANU-SUSTINA.md"
OUTPUT = ROOT / "PRIPREMA-ZA-ODBRANU.html"


def render_markdown(source: str) -> tuple[str, list[dict[str, object]]]:
    renderer = markdown.Markdown(
        extensions=["extra", "sane_lists", "toc"],
        extension_configs={"toc": {"slugify": slugify_unicode}},
        output_format="html5",
    )
    body = renderer.convert(source)
    return body, renderer.toc_tokens


def render_toc(tokens: list[dict[str, object]]) -> str:
    links = ['<a class="toc-link overview-link" href="#pre-pocetka">Pre početka</a>']
    for token in tokens:
        if int(token["level"]) != 1:
            continue
        label = str(token["name"])
        if label == "Priprema za odbranu master rada":
            continue
        links.append(
            f'<a class="toc-link" href="#{html.escape(str(token["id"]), quote=True)}">'
            f'{html.escape(label)}</a>'
        )
    return "\n".join(links)


def replace_mermaid(body: str) -> str:
    architecture_diagram = """
<figure class="architecture" aria-labelledby="architecture-caption">
  <div class="architecture-flow" role="img" aria-label="Tok od korisnika preko Angular klijenta i Express servera do baze, AI servisa i statističke obrade">
    <div class="architecture-column">
      <div class="architecture-node accent-coral">Korisnik</div>
    </div>
    <div class="architecture-arrow" aria-hidden="true">→</div>
    <div class="architecture-column">
      <div class="architecture-node accent-teal">Angular klijent</div>
      <div class="architecture-detail">Algoritmi · trag događaja · Canvas</div>
    </div>
    <div class="architecture-arrow bidirectional" aria-hidden="true">↔</div>
    <div class="architecture-column">
      <div class="architecture-node accent-gold">Express server</div>
      <div class="architecture-detail">REST · Socket.io · validacija</div>
    </div>
    <div class="architecture-arrow" aria-hidden="true">→</div>
    <div class="architecture-column architecture-targets">
      <div class="architecture-node">MongoDB</div>
      <div class="architecture-node">GitHub Models</div>
      <div class="architecture-node">Cloudinary</div>
    </div>
  </div>
  <div class="benchmark-flow">
    <span>Benchmark skripte</span><b aria-hidden="true">→</b><span>serverski runner</span><b aria-hidden="true">→</b><span>CSV / JSON</span><b aria-hidden="true">→</b><span>Python analiza</span>
  </div>
  <figcaption id="architecture-caption">Klijentski tok i odvojeni tok ponovljivih merenja.</figcaption>
</figure>
""".strip()

    request_diagram = """
<figure class="request-diagram" aria-labelledby="request-caption">
  <div class="request-flow" role="img" aria-label="Tok AI preporuke od korisničkog klika do odgovora prikazanog u Angular aplikaciji">
    <div class="request-step"><span>1</span><strong>Angular</strong><small>Korisnik traži preporuku; klijent priprema mapu.</small></div>
    <div class="request-step"><span>2</span><strong>REST zahtev</strong><small>JSON i JWT odlaze na <code>POST /api/ai/recommend</code>.</small></div>
    <div class="request-step"><span>3</span><strong>Express</strong><small>Autentikacija i Zod proveravaju zahtev.</small></div>
    <div class="request-step"><span>4</span><strong>Algoritmi + AI</strong><small>Server meri osam algoritama; GitHub Models objašnjava.</small></div>
    <div class="request-step"><span>5</span><strong>Prikaz</strong><small>JSON se vraća; RxJS i Angular osvežavaju panel.</small></div>
  </div>
  <figcaption id="request-caption">Jedan konkretan zahtev: proverljive brojke računa server, a jezički model ih objašnjava.</figcaption>
</figure>
""".strip()

    diagrams = iter((architecture_diagram, request_diagram))

    def next_diagram(match: re.Match[str]) -> str:
        return next(diagrams, match.group(0))

    return re.sub(
        r'<pre><code class="language-mermaid">.*?</code></pre>',
        next_diagram,
        body,
        flags=re.DOTALL,
    )


def extract_title(body: str) -> tuple[str, str]:
    match = re.match(r'\s*<h1[^>]*>(.*?)</h1>', body, flags=re.DOTALL)
    if not match:
        return "Priprema za odbranu master rada", body
    title = re.sub(r"<[^>]+>", "", match.group(1))
    return html.unescape(title), body[match.end():]


def build_document(title: str, toc: str, body: str) -> str:
    template = r"""<!doctype html>
<html lang="sr-Latn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="Praktičan vodič za odbranu master rada o vizualizaciji algoritama za pronalaženje puta sa AI podrškom.">
  <title>__TITLE__</title>
  <style>
    :root {
      --reader-scale: 1;
      --bg: #eef2f3;
      --surface: #ffffff;
      --surface-soft: #f5f8f8;
      --ink: #1e292d;
      --muted: #607177;
      --line: #d7e0e2;
      --sidebar: #17262b;
      --sidebar-ink: #e7f0f1;
      --teal: #087f7a;
      --teal-soft: #daf1ee;
      --coral: #c8503e;
      --coral-soft: #fce6e1;
      --gold: #a66b00;
      --gold-soft: #fff1ca;
      --code: #172126;
      --shadow: 0 16px 48px rgba(24, 47, 54, .09);
      --content-width: 920px;
      --sidebar-width: 286px;
    }

    html[data-theme="dark"] {
      --bg: #121b1e;
      --surface: #1b282c;
      --surface-soft: #223237;
      --ink: #e8eff0;
      --muted: #a7b6ba;
      --line: #35484e;
      --sidebar: #0d1518;
      --sidebar-ink: #e7f0f1;
      --teal: #55c8bd;
      --teal-soft: #193c3a;
      --coral: #f08a76;
      --coral-soft: #472d2a;
      --gold: #efbf5a;
      --gold-soft: #44391f;
      --code: #0d1518;
      --shadow: 0 18px 54px rgba(0, 0, 0, .28);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; scroll-padding-top: 82px; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(90deg, rgba(8, 127, 122, .035) 1px, transparent 1px) 0 0 / 28px 28px,
        var(--bg);
      font-family: Candara, "Trebuchet MS", sans-serif;
      font-size: calc(17px * var(--reader-scale));
      line-height: 1.68;
      letter-spacing: 0;
      overflow-x: hidden;
    }

    a { color: var(--teal); text-underline-offset: 3px; }
    button, input { font: inherit; }
    button { cursor: pointer; }

    .progress {
      position: fixed;
      inset: 0 auto auto 0;
      width: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--teal), var(--coral));
      z-index: 50;
    }

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      width: var(--sidebar-width);
      padding: 26px 18px 22px;
      color: var(--sidebar-ink);
      background: var(--sidebar);
      overflow-y: auto;
      z-index: 30;
    }

    .sidebar-brand {
      padding: 0 10px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, .14);
    }

    .sidebar-brand strong {
      display: block;
      color: #e7f0f1;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 22px;
      line-height: 1.2;
      letter-spacing: 0;
    }

    .sidebar-brand span {
      display: block;
      margin-top: 7px;
      color: #9fb3b8;
      font-size: 13px;
      line-height: 1.35;
    }

    .search-wrap { margin: 18px 4px 14px; }
    .search-row { display: flex; gap: 7px; }
    .search-row input {
      min-width: 0;
      width: 100%;
      padding: 9px 10px;
      color: #f4f8f8;
      background: rgba(255, 255, 255, .08);
      border: 1px solid rgba(255, 255, 255, .18);
      border-radius: 6px;
      outline: none;
    }
    .search-row input:focus { border-color: #55c8bd; box-shadow: 0 0 0 3px rgba(85, 200, 189, .16); }
    .search-count { min-height: 20px; margin-top: 5px; color: #9fb3b8; font-size: 12px; }

    .toc { display: grid; gap: 2px; }
    .toc-link {
      display: block;
      padding: 7px 10px;
      color: #b9c9cc;
      border-left: 3px solid transparent;
      text-decoration: none;
      font-size: 13px;
      line-height: 1.3;
      border-radius: 0 5px 5px 0;
    }
    .toc-link:hover { color: #fff; background: rgba(255, 255, 255, .07); }
    .toc-link.active { color: #fff; border-left-color: #55c8bd; background: rgba(85, 200, 189, .12); }

    .toolbar {
      position: fixed;
      top: 14px;
      right: 18px;
      display: flex;
      gap: 7px;
      padding: 6px;
      background: color-mix(in srgb, var(--surface) 90%, transparent);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(12px);
      z-index: 25;
    }

    .tool-button {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      padding: 0;
      color: var(--ink);
      background: transparent;
      border: 0;
      border-radius: 5px;
      font-weight: 700;
    }
    .tool-button:hover { color: var(--teal); background: var(--teal-soft); }
    .menu-button { display: none; }

    .page {
      min-width: 0;
      margin-left: var(--sidebar-width);
      padding: 74px 34px 90px;
    }

    .reader {
      width: min(100%, var(--content-width));
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
    }

    .hero {
      position: relative;
      padding: 52px 58px 44px;
      color: #f7fbfb;
      background:
        linear-gradient(135deg, rgba(8, 127, 122, .94), rgba(23, 38, 43, .96) 58%, rgba(200, 80, 62, .88));
      overflow: hidden;
    }
    .hero::after {
      content: "";
      position: absolute;
      right: -70px;
      bottom: -90px;
      width: 260px;
      height: 180px;
      border: 28px solid rgba(255, 255, 255, .08);
      transform: rotate(-12deg);
    }
    .hero-kicker { margin: 0 0 13px; color: #bfe9e4; font-size: 14px; font-weight: 700; text-transform: uppercase; }
    .hero h1 {
      position: relative;
      max-width: 720px;
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(36px, 6vw, 58px);
      line-height: 1.06;
      letter-spacing: 0;
      z-index: 1;
    }
    .hero p { position: relative; max-width: 670px; margin: 20px 0 0; color: #dcebec; font-size: 18px; z-index: 1; }

    .overview {
      padding: 38px 58px 42px;
      background: var(--surface-soft);
      border-bottom: 1px solid var(--line);
    }
    .overview h2 { margin-top: 0; }
    .overview-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 28px;
      margin-top: 22px;
    }
    .overview-item { display: grid; grid-template-columns: 30px 1fr; gap: 10px; align-items: start; }
    .overview-number {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      color: #fff;
      background: var(--teal);
      border-radius: 50%;
      font-size: 13px;
      font-weight: 800;
    }
    .overview-item .overview-number { color: #fff; }
    .overview-item strong { display: block; color: var(--ink); }
    .overview-item span { display: block; color: var(--muted); font-size: 14px; line-height: 1.4; }

    article { padding: 20px 58px 70px; }
    article > h1 {
      margin: 72px -58px 30px;
      padding: 30px 58px 20px;
      color: var(--ink);
      background: linear-gradient(90deg, var(--teal-soft), transparent 76%);
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 34px;
      line-height: 1.18;
      letter-spacing: 0;
    }
    article > h1:first-child { margin-top: 18px; }
    h2, h3, h4 {
      color: var(--ink);
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.25;
      letter-spacing: 0;
    }
    h2 { margin: 42px 0 14px; font-size: 27px; }
    h3 { margin: 31px 0 10px; font-size: 22px; }
    h4 { margin: 24px 0 8px; font-size: 18px; }
    p { margin: 0 0 17px; }
    li { margin: 5px 0; }
    ul, ol { padding-left: 26px; }
    strong { color: color-mix(in srgb, var(--ink) 86%, var(--teal)); }
    hr { margin: 54px 0; border: 0; border-top: 1px solid var(--line); }

    blockquote {
      margin: 24px 0;
      padding: 18px 22px;
      color: var(--ink);
      background: var(--teal-soft);
      border-left: 5px solid var(--teal);
    }
    blockquote p:last-child { margin-bottom: 0; }

    .table-wrap { width: 100%; margin: 24px 0 30px; overflow-x: auto; border: 1px solid var(--line); }
    table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: .92em; line-height: 1.4; }
    th, td { padding: 11px 13px; text-align: left; vertical-align: top; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    th:last-child, td:last-child { border-right: 0; }
    tr:last-child td { border-bottom: 0; }
    th { color: #fff; background: var(--sidebar); font-weight: 700; }
    tbody tr:nth-child(even) { background: var(--surface-soft); }

    code {
      padding: 2px 5px;
      color: var(--coral);
      background: var(--coral-soft);
      border-radius: 4px;
      font-family: Consolas, "Courier New", monospace;
      font-size: .88em;
    }
    pre {
      margin: 24px 0;
      padding: 20px;
      color: #dbe7e9;
      background: var(--code);
      overflow: auto;
      border-left: 5px solid var(--coral);
    }
    pre code { padding: 0; color: inherit; background: transparent; }

    .architecture { margin: 28px 0; padding: 24px; background: var(--surface-soft); border: 1px solid var(--line); }
    .architecture-flow { display: grid; grid-template-columns: 1fr auto 1.25fr auto 1.25fr auto 1fr; gap: 10px; align-items: center; }
    .architecture-column { display: grid; gap: 8px; }
    .architecture-node { padding: 11px 10px; text-align: center; background: var(--surface); border: 2px solid var(--line); font-weight: 700; }
    .architecture-node.accent-teal { border-color: var(--teal); }
    .architecture-node.accent-coral { border-color: var(--coral); }
    .architecture-node.accent-gold { border-color: var(--gold); }
    .architecture-detail { color: var(--muted); text-align: center; font-size: 12px; line-height: 1.35; }
    .architecture-targets { gap: 6px; }
    .architecture-targets .architecture-node { padding: 7px; font-size: 13px; }
    .architecture-arrow { color: var(--teal); font-size: 25px; font-weight: 800; }
    .architecture-arrow.bidirectional { color: var(--coral); }
    .benchmark-flow { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 14px; }
    .benchmark-flow span { padding: 6px 9px; background: var(--gold-soft); border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--line)); }
    .benchmark-flow b { color: var(--gold); }
    .request-diagram { margin: 28px 0; padding: 24px; background: var(--surface-soft); border: 1px solid var(--line); }
    .request-flow { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 24px; align-items: stretch; }
    .request-step { position: relative; min-width: 0; padding: 14px 12px; background: var(--surface); border: 2px solid var(--line); text-align: center; }
    .request-step:not(:last-child)::after { content: "→"; position: absolute; top: 50%; right: -21px; color: var(--teal); font-size: 22px; font-weight: 800; transform: translateY(-50%); }
    .request-step > span { display: grid; place-items: center; width: 24px; height: 24px; margin: 0 auto 8px; color: #fff; background: var(--coral); border-radius: 50%; font-size: 12px; font-weight: 800; }
    .request-step strong { display: block; margin-bottom: 5px; }
    .request-step small { display: block; color: var(--muted); font-size: 12px; line-height: 1.35; }
    figcaption { margin-top: 13px; color: var(--muted); text-align: center; font-size: 13px; }

    .MathJax { font-size: 1.03em !important; }
    mark { color: #1c2427; background: #ffe36e; box-shadow: 0 0 0 2px #ffe36e; }
    mark.current { background: #ff9a76; box-shadow: 0 0 0 2px #ff9a76; }

    .back-to-top {
      position: fixed;
      right: 22px;
      bottom: 22px;
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      color: #fff;
      background: var(--teal);
      border: 0;
      border-radius: 50%;
      box-shadow: var(--shadow);
      opacity: 0;
      transform: translateY(8px);
      pointer-events: none;
      transition: opacity .2s, transform .2s;
      z-index: 20;
    }
    .back-to-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }

    @media (max-width: 980px) {
      .sidebar { transform: translateX(-100%); transition: transform .22s ease; box-shadow: 18px 0 44px rgba(0, 0, 0, .24); }
      body.menu-open .sidebar { transform: translateX(0); }
      .page { margin-left: 0; padding-inline: 18px; }
      .menu-button { display: grid; }
      body.menu-open::after { content: ""; position: fixed; inset: 0; background: rgba(4, 12, 14, .45); z-index: 28; }
      .toolbar { left: 14px; right: auto; }
    }

    @media (max-width: 700px) {
      html, body, .page, .reader, .hero, .overview, article { width: 100%; max-width: 100%; min-width: 0; }
      body { font-size: calc(16px * var(--reader-scale)); }
      .page { padding: 66px 0 0; }
      .reader { border-inline: 0; }
      .hero, .overview, article { padding-inline: 24px; }
      .hero { padding-block: 40px 34px; }
      .hero h1 { font-size: 38px; }
      .hero h1, .hero p, .overview p, .overview-item, .overview-item > div { min-width: 0; overflow-wrap: anywhere; }
      .overview-grid { grid-template-columns: 1fr; }
      article > h1 { margin-inline: -24px; padding-inline: 24px; font-size: 29px; }
      h2 { font-size: 24px; }
      .architecture-flow { grid-template-columns: 1fr; }
      .architecture-arrow { transform: rotate(90deg); justify-self: center; }
      .architecture-arrow.bidirectional { transform: rotate(90deg); }
      .request-flow { grid-template-columns: 1fr; }
      .request-step:not(:last-child)::after { top: auto; right: 50%; bottom: -24px; transform: translateX(50%) rotate(90deg); }
      .toolbar { top: 10px; }
      .tool-button { width: 36px; height: 36px; }
    }

    @media print {
      :root { --bg: #fff; --surface: #fff; --surface-soft: #f5f5f5; --ink: #111; --muted: #444; --line: #bbb; }
      body { background: #fff; font-size: 11pt; }
      .sidebar, .toolbar, .progress, .back-to-top { display: none !important; }
      .page { margin: 0; padding: 0; }
      .reader { width: 100%; max-width: none; border: 0; box-shadow: none; }
      .hero { padding: 34px 40px; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .overview, article { padding-inline: 40px; }
      article > h1 { margin-inline: -40px; padding-inline: 40px; break-before: page; }
      article > h1:first-child { break-before: auto; }
      table, blockquote, figure, pre { break-inside: avoid; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
  <script>
    window.MathJax = {
      tex: { inlineMath: [['$', '$']], displayMath: [['$$', '$$']] },
      options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
  <div class="progress" id="progress"></div>
  <aside class="sidebar" id="sidebar" aria-label="Sadržaj dokumenta">
    <div class="sidebar-brand">
      <strong>Odbrana master rada</strong>
      <span>Vodič za razumevanje i prirodno izlaganje rada</span>
    </div>
    <div class="search-wrap">
      <div class="search-row">
        <input id="search" type="search" placeholder="Pretraži dokument" aria-label="Pretraži dokument">
      </div>
      <div class="search-count" id="search-count" aria-live="polite"></div>
    </div>
    <nav class="toc" id="toc">__TOC__</nav>
  </aside>

  <div class="toolbar" aria-label="Alati dokumenta">
    <button class="tool-button menu-button" id="menu-button" type="button" title="Otvori sadržaj" aria-label="Otvori sadržaj">☰</button>
    <button class="tool-button" id="font-down" type="button" title="Smanji tekst" aria-label="Smanji tekst">A−</button>
    <button class="tool-button" id="font-up" type="button" title="Povećaj tekst" aria-label="Povećaj tekst">A+</button>
    <button class="tool-button" id="theme-button" type="button" title="Promeni temu" aria-label="Promeni temu">◐</button>
    <button class="tool-button" id="print-button" type="button" title="Štampaj ili sačuvaj kao PDF" aria-label="Štampaj ili sačuvaj kao PDF">⎙</button>
  </div>

  <main class="page">
    <div class="reader">
      <header class="hero" id="vrh">
        <p class="hero-kicker">Praktična priprema · 2026</p>
        <h1>__TITLE__</h1>
        <p>Jednostavna priča o problemu, načinu rada algoritama, izgrađenom sistemu, proveri rezultata i glavnim zaključcima.</p>
      </header>

      <section class="overview" id="pre-pocetka">
        <h2>Šta se nalazi u dokumentu</h2>
        <p>Vodič gradi razumevanje kroz običan jezik i male primere. Cilj nije pamćenje teksta, već prirodno objašnjavanje sopstvenog rada.</p>
        <div class="overview-grid">
          <div class="overview-item"><span class="overview-number">1</span><div><strong>Suština rada</strong><span>Problem, napravljeno rešenje i doprinos u nekoliko jasnih ideja.</span></div></div>
          <div class="overview-item"><span class="overview-number">2</span><div><strong>Algoritmi</strong><span>Kako osam postupaka „razmišlja” i zašto se različito ponašaju.</span></div></div>
          <div class="overview-item"><span class="overview-number">3</span><div><strong>Sistem</strong><span>Tehnologije, biblioteke, REST, Socket.IO, interfejsi i tokovi podataka.</span></div></div>
          <div class="overview-item"><span class="overview-number">4</span><div><strong>Provera rada</strong><span>Metrike, statistička obrada, UX okviri i granice izvedenih zaključaka.</span></div></div>
          <div class="overview-item"><span class="overview-number">5</span><div><strong>AI i Playground</strong><span>Kako AI objašnjava proverene činjenice i kako korisnik aktivno uči.</span></div></div>
          <div class="overview-item"><span class="overview-number">6</span><div><strong>Odbrana</strong><span>Prirodna pitanja, jednostavan tok prezentacije i završna mentalna mapa.</span></div></div>
        </div>
      </section>

      <article id="document-content">__CONTENT__</article>
    </div>
  </main>

  <button class="back-to-top" id="back-to-top" type="button" title="Nazad na vrh" aria-label="Nazad na vrh">↑</button>

  <script>
    (() => {
      const root = document.documentElement;
      const body = document.body;
      const progress = document.getElementById('progress');
      const backToTop = document.getElementById('back-to-top');
      const search = document.getElementById('search');
      const searchCount = document.getElementById('search-count');
      const article = document.getElementById('document-content');
      let marks = [];
      let markIndex = -1;

      const savedTheme = localStorage.getItem('defense-theme');
      if (savedTheme) root.dataset.theme = savedTheme;
      const savedScale = Number(localStorage.getItem('defense-scale'));
      if (savedScale >= .85 && savedScale <= 1.3) root.style.setProperty('--reader-scale', savedScale);

      const updateScroll = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? window.scrollY / max : 0;
        progress.style.width = `${Math.min(1, Math.max(0, ratio)) * 100}%`;
        backToTop.classList.toggle('visible', window.scrollY > 700);
      };
      addEventListener('scroll', updateScroll, { passive: true });
      updateScroll();

      document.getElementById('menu-button').addEventListener('click', () => body.classList.toggle('menu-open'));
      document.getElementById('toc').addEventListener('click', () => body.classList.remove('menu-open'));
      document.querySelector('.page').addEventListener('click', () => body.classList.remove('menu-open'));
      document.getElementById('print-button').addEventListener('click', () => print());
      backToTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

      document.getElementById('theme-button').addEventListener('click', () => {
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        root.dataset.theme = next;
        localStorage.setItem('defense-theme', next);
      });

      const changeScale = delta => {
        const current = Number(getComputedStyle(root).getPropertyValue('--reader-scale')) || 1;
        const next = Math.min(1.3, Math.max(.85, Math.round((current + delta) * 100) / 100));
        root.style.setProperty('--reader-scale', next);
        localStorage.setItem('defense-scale', next);
      };
      document.getElementById('font-down').addEventListener('click', () => changeScale(-.05));
      document.getElementById('font-up').addEventListener('click', () => changeScale(.05));

      document.querySelectorAll('table').forEach(table => {
        const wrap = document.createElement('div');
        wrap.className = 'table-wrap';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
      });

      const clearMarks = () => {
        document.querySelectorAll('mark[data-search]').forEach(mark => {
          mark.replaceWith(document.createTextNode(mark.textContent));
        });
        article.normalize();
        marks = [];
        markIndex = -1;
      };

      const showMark = index => {
        if (!marks.length) return;
        marks.forEach(mark => mark.classList.remove('current'));
        markIndex = (index + marks.length) % marks.length;
        marks[markIndex].classList.add('current');
        marks[markIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchCount.textContent = `${markIndex + 1} / ${marks.length}`;
      };

      const runSearch = () => {
        clearMarks();
        const query = search.value.trim();
        if (query.length < 2) {
          searchCount.textContent = query ? 'Unesi najmanje 2 znaka' : '';
          return;
        }
        const lower = query.toLocaleLowerCase('sr-Latn');
        const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent || parent.closest('script, style, code, pre, mark')) return NodeFilter.FILTER_REJECT;
            return node.nodeValue.toLocaleLowerCase('sr-Latn').includes(lower)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
          const text = node.nodeValue;
          const fragment = document.createDocumentFragment();
          let cursor = 0;
          let index;
          while ((index = text.toLocaleLowerCase('sr-Latn').indexOf(lower, cursor)) !== -1) {
            fragment.append(text.slice(cursor, index));
            const mark = document.createElement('mark');
            mark.dataset.search = 'true';
            mark.textContent = text.slice(index, index + query.length);
            fragment.append(mark);
            cursor = index + query.length;
          }
          fragment.append(text.slice(cursor));
          node.replaceWith(fragment);
        });
        marks = [...document.querySelectorAll('mark[data-search]')];
        searchCount.textContent = marks.length ? `${marks.length} rezultata · Enter za sledeći` : 'Nema rezultata';
        if (marks.length) showMark(0);
      };

      let searchTimer;
      search.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(runSearch, 220);
      });
      search.addEventListener('keydown', event => {
        if (event.key === 'Enter' && marks.length) {
          event.preventDefault();
          showMark(markIndex + (event.shiftKey ? -1 : 1));
        }
      });

      const links = new Map([...document.querySelectorAll('.toc-link')].map(link => [decodeURIComponent(link.hash.slice(1)), link]));
      const headings = [...document.querySelectorAll('#pre-pocetka, article > h1')];
      const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        document.querySelectorAll('.toc-link').forEach(link => link.classList.remove('active'));
        links.get(visible.target.id)?.classList.add('active');
      }, { rootMargin: '-10% 0px -78% 0px', threshold: 0 });
      headings.forEach(heading => observer.observe(heading));
    })();
  </script>
</body>
</html>
"""
    return (
        template.replace("__TITLE__", html.escape(title))
        .replace("__TOC__", toc)
        .replace("__CONTENT__", body)
    )


def validate_document(document: str) -> dict[str, int]:
    required = (
    "Šta je heuristika?",
    "Šta znači suboptimalnost?",
    "Program računa, a AI objašnjava.",
    "Najbolji algoritam ne postoji van konteksta.",
    "REST i Socket.IO nisu ista stvar",
    "interface PathfindingAlgorithm",
    "Nielsenovim heuristikama",
        'id="pre-pocetka"',
        'class="architecture"',
    'class="request-diagram"',
    )
    missing = [value for value in required if value not in document]
    if missing:
        raise ValueError(f"HTML is missing required content: {missing}")
    stale = ["__CONTENT__", "__TOC__", "language-mermaid"]
    unresolved = [value for value in stale if value in document]
    if unresolved:
        raise ValueError(f"HTML contains unresolved content: {unresolved}")
    parser = HTMLParser()
    parser.feed(document)
    parser.close()
    return {
        "characters": len(document),
        "tables": document.count("<table>"),
        "sections": document.count("<h1 id="),
        "toc_links": document.count('class="toc-link'),
    }


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    body, tokens = render_markdown(source)
    title, body = extract_title(body)
    body = replace_mermaid(body)
    document = build_document(title, render_toc(tokens), body)
    metrics = validate_document(document)
    OUTPUT.write_text(document, encoding="utf-8", newline="\n")
    print(f"Created {OUTPUT.name}: {metrics}")


if __name__ == "__main__":
    main()