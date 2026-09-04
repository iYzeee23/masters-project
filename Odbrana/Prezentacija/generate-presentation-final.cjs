const fs = require("node:fs");
const path = require("node:path");
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
const outputName = process.env.PPTX_OUTPUT_NAME || "ODBRANA-MASTER-RADA-PREDRAG-PESIC-FINAL-V2.pptx";
const outputPath = path.resolve(__dirname, outputName);
const thesisImage = fileName => path.resolve(__dirname, "..", "..", "Pisanje master rada", "Slike", fileName);

const W = 13.333;
const H = 7.5;
const FONT_HEAD = "Georgia";
const FONT_BODY = "Aptos";
const C = {
  bg: "F8F3EC",
  surface: "FFFDFC",
  soft: "EEE5DA",
  soft2: "F3ECE4",
  ink: "352B26",
  muted: "786B62",
  line: "DED2C5",
  brown: "8B5E50",
  deepBrown: "6E473B",
  coral: "D85B4A",
  teal: "328C8B",
  blue: "4B91B8",
  violet: "8066B5",
  gold: "D49A32",
  green: "4F8D4A",
  white: "FFFFFF"
};

pptx.layout = "LAYOUT_WIDE";
pptx.author = "Predrag Pešić";
pptx.company = "Univerzitet u Beogradu · Elektrotehnički fakultet";
pptx.subject = "Odbrana master rada";
pptx.title = "Interaktivna vizualizacija grafovskih algoritama za pronalaženje puta sa podrškom veštačke inteligencije";
pptx.lang = "sr-Latn";
pptx.theme = {
  headFontFace: FONT_HEAD,
  bodyFontFace: FONT_BODY,
  lang: "sr-Latn"
};

const requiredImages = [
  thesisImage("etf-logo-transparent.png"),
  thesisImage("snimak-5-2-2.png")
];

for (const requiredImage of requiredImages) {
  if (!fs.existsSync(requiredImage)) {
    throw new Error(`Nedostaje vizuelni resurs: ${requiredImage}`);
  }
}

function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    margin: 0,
    fontFace: FONT_BODY,
    fontSize: 17,
    color: C.ink,
    valign: "mid",
    breakLine: false,
    fit: "shrink",
    ...options
  });
}

function addRichText(slide, runs, x, y, w, h, options = {}) {
  slide.addText(runs, {
    x,
    y,
    w,
    h,
    margin: 0,
    fontFace: FONT_HEAD,
    fontSize: 30,
    color: C.ink,
    valign: "mid",
    breakLine: false,
    fit: "shrink",
    ...options
  });
}

function addRect(slide, x, y, w, h, fill, line = fill, options = {}) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: typeof fill === "string" ? { color: fill } : fill,
    line: typeof line === "string" ? { color: line } : line,
    ...options
  });
}

function addRoundRect(slide, x, y, w, h, fill, line = fill, options = {}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: typeof fill === "string" ? { color: fill } : fill,
    line: typeof line === "string" ? { color: line } : line,
    radius: 0.08,
    ...options
  });
}

function addCircle(slide, x, y, diameter, fill, line = fill, options = {}) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x,
    y,
    w: diameter,
    h: diameter,
    fill: typeof fill === "string" ? { color: fill } : fill,
    line: typeof line === "string" ? { color: line } : line,
    ...options
  });
}

function addLine(slide, x, y, w, h, color = C.line, width = 1, options = {}) {
  slide.addShape(pptx.ShapeType.line, {
    x,
    y,
    w,
    h,
    line: { color, width, ...options }
  });
}

function addArrow(slide, x, y, w, h, color = C.brown, width = 1.5) {
  addLine(slide, x, y, w, h, color, width, { endArrowType: "triangle" });
}

function addImage(slide, filePath, x, y, w, h, sizingType, altText) {
  slide.addImage({
    path: filePath,
    x,
    y,
    w,
    h,
    sizing: { type: sizingType, w, h },
    altText
  });
}

function addNotes(slide, text) {
  slide.addNotes(text);
}

function addTitle(slide, title, options = {}) {
  addText(slide, title, options.x ?? 0.72, options.y ?? 0.76, options.w ?? 11.8, options.h ?? 0.72, {
    fontFace: FONT_HEAD,
    fontSize: options.fontSize ?? 29,
    color: options.color ?? C.ink,
    valign: "top",
    breakLine: true,
    ...options
  });
}

function addBaseSlide(number, section) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  addRect(slide, 0, 0, W, 0.075, C.brown, C.brown);
  addText(slide, section.toUpperCase(), 0.72, 0.3, 7.5, 0.2, {
    fontSize: 10,
    bold: true,
    color: C.brown,
    charSpacing: 1.2
  });
  addLine(slide, 0.72, 7.03, 11.9, 0, C.line, 0.8);
  addText(slide, String(number).padStart(2, "0"), 12.08, 7.1, 0.54, 0.16, {
    fontSize: 8.5,
    bold: true,
    color: C.muted,
    align: "right"
  });
  return slide;
}

function addStepBadge(slide, number, x, y, color) {
  addCircle(slide, x, y, 0.48, color, color);
  addText(slide, String(number), x, y + 0.045, 0.48, 0.32, {
    fontSize: 12,
    bold: true,
    color: C.white,
    align: "center"
  });
}

function addMiniGrid(slide, x, y, columns, rows, cellSize, fills = new Map()) {
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      addRect(
        slide,
        x + column * cellSize,
        y + row * cellSize,
        cellSize - 0.025,
        cellSize - 0.025,
        fills.get(`${column},${row}`) ?? C.surface,
        C.line
      );
    }
  }
}

function addMetricIllustration(slide, kind, x, y, color) {
  addRoundRect(slide, x, y, 1.12, 1.04, C.soft2, C.line);

  if (kind === "expanded") {
    const fills = new Map([
      ["0,1", C.blue], ["1,0", C.blue], ["1,1", C.violet],
      ["1,2", C.violet], ["2,1", C.blue], ["2,2", C.violet]
    ]);
    addMiniGrid(slide, x + 0.2, y + 0.24, 4, 3, 0.18, fills);
  } else if (kind === "frontier") {
    addText(slide, "OPEN", x + 0.16, y + 0.12, 0.8, 0.18, { fontSize: 7.5, bold: true, color, align: "center", charSpacing: 0.8 });
    [0, 1, 2, 3].forEach(index => {
      addCircle(slide, x + 0.18 + index * 0.2, y + 0.45, 0.14, index < 3 ? color : C.surface, color, { line: { color, width: 1 } });
    });
    addLine(slide, x + 0.2, y + 0.78, 0.7, 0, color, 2);
  } else if (kind === "cost") {
    ["1", "4", "2"].forEach((weight, index) => {
      addRoundRect(slide, x + 0.13 + index * 0.31, y + 0.37, 0.25, 0.28, index === 1 ? { color, transparency: 78 } : C.surface, color);
      addText(slide, weight, x + 0.13 + index * 0.31, y + 0.41, 0.25, 0.18, { fontSize: 9, bold: true, color, align: "center" });
    });
    addText(slide, "Σ = 7", x + 0.2, y + 0.72, 0.72, 0.18, { fontSize: 9, bold: true, color, align: "center" });
  } else {
    addText(slide, "REF", x + 0.12, y + 0.23, 0.27, 0.16, { fontSize: 7.5, bold: true, color: C.muted });
    addRect(slide, x + 0.42, y + 0.25, 0.48, 0.08, C.teal, C.teal);
    addText(slide, "PUT", x + 0.12, y + 0.56, 0.27, 0.16, { fontSize: 7.5, bold: true, color: C.muted });
    addRect(slide, x + 0.42, y + 0.58, 0.63, 0.08, color, color);
    addText(slide, "+%", x + 0.72, y + 0.73, 0.28, 0.18, { fontSize: 9, bold: true, color, align: "right" });
  }
}

function addAlgorithmGlyph(slide, glyph, x, y, color) {
  addCircle(slide, x, y, 0.62, { color, transparency: 84 }, color, { line: { color, width: 1.2 } });
  addText(slide, glyph, x, y + 0.14, 0.62, 0.26, {
    fontFace: FONT_HEAD,
    fontSize: glyph.length > 3 ? 9.5 : 12.5,
    bold: true,
    color,
    align: "center"
  });
}

{
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  addRect(slide, 0, 0, W, 0.075, C.brown, C.brown);
  addText(slide, "UNIVERZITET U BEOGRADU · ELEKTROTEHNIČKI FAKULTET", 0.86, 0.52, 8.4, 0.28, {
    fontSize: 12,
    bold: true,
    color: C.deepBrown,
    charSpacing: 0.7
  });
  addRoundRect(slide, 9.48, 0.82, 2.96, 4.34, C.soft2, C.soft2);
  addCircle(slide, 9.86, 1.33, 2.2, { color: C.white, transparency: 42 }, { color: C.line, transparency: 100 });
  addImage(slide, thesisImage("etf-logo-transparent.png"), 9.72, 1.08, 2.48, 3.28, "contain", "Grb Elektrotehničkog fakulteta Univerziteta u Beogradu");
  addText(slide, "MASTER RAD", 9.8, 4.55, 2.32, 0.25, { fontSize: 10, bold: true, color: C.brown, align: "center", charSpacing: 1.8 });
  addRect(slide, 0.86, 1.42, 0.085, 3.38, C.brown, C.brown);
  addText(slide, "Interaktivna vizualizacija grafovskih algoritama za pronalaženje puta sa podrškom veštačke inteligencije", 1.22, 1.39, 7.83, 3.25, {
    fontFace: FONT_HEAD,
    fontSize: 31,
    color: C.ink,
    valign: "mid",
    breakLine: true
  });
  addRoundRect(slide, 0.86, 5.34, 11.58, 1.16, C.soft2, C.soft2);
  addRect(slide, 0.86, 5.34, 11.58, 0.055, C.brown, C.brown);
  addText(slide, "KANDIDAT", 1.14, 5.58, 1.52, 0.18, { fontSize: 9.5, bold: true, color: C.brown, charSpacing: 1.1 });
  addText(slide, "Predrag Pešić · 2024/3281", 1.14, 5.87, 3.45, 0.34, { fontSize: 17.5, bold: true, color: C.ink });
  addLine(slide, 4.77, 5.55, 0, 0.72, C.line, 1);
  addText(slide, "MENTOR", 5.13, 5.58, 1.34, 0.18, { fontSize: 9.5, bold: true, color: C.brown, charSpacing: 1.1 });
  addText(slide, "prof. dr Marija Punt", 5.13, 5.87, 3.72, 0.34, { fontSize: 17.5, bold: true, color: C.ink });
  addLine(slide, 9.36, 5.55, 0, 0.72, C.line, 1);
  addText(slide, "ODBRANA", 9.72, 5.58, 1.4, 0.18, { fontSize: 9.5, bold: true, color: C.brown, charSpacing: 1.1 });
  addText(slide, "Beograd, 2026.", 9.72, 5.87, 2.18, 0.34, { fontSize: 14, color: C.ink });
  addNotes(slide, "Tema rada je razvoj interaktivnog sistema koji povezuje vizualizaciju, poređenje, merenje i aktivno učenje algoritama za pronalaženje puta. Veštačka inteligencija ima pomoćnu ulogu: objašnjava rezultate koje je sistem prethodno proverio.");
}

{
  const slide = addBaseSlide(2, "Problem i cilj");
  addTitle(slide, "Kako vizualizaciju pretvoriti u učenje?");
  addText(slide, "Sama animacija nije dovoljna.", 0.74, 1.47, 10.9, 0.42, {
    fontSize: 18,
    color: C.muted,
    valign: "top",
    breakLine: true
  });

  const questions = [
    { x: 0.82, title: "VIDETI TOK", question: "Kako algoritam dolazi do rešenja?", color: C.blue },
    { x: 4.64, title: "UPOREDITI", question: "Zašto se algoritmi razlikuju?", color: C.teal },
    { x: 8.46, title: "POKUŠATI", question: "Može li korisnik da reši problem?", color: C.gold }
  ];

  questions.forEach((item, index) => {
    addRoundRect(slide, item.x, 2.42, 3.42, 2.72, C.surface, C.line);
    addCircle(slide, item.x + 1.27, 2.72, 0.88, { color: item.color, transparency: 87 }, item.color, { line: { color: item.color, width: 1.2 } });
    if (index === 0) {
      const fills = new Map([["0,1", C.blue], ["1,1", C.blue], ["2,1", C.violet], ["2,2", C.violet]]);
      addMiniGrid(slide, item.x + 1.47, 2.91, 3, 3, 0.16, fills);
    } else if (index === 1) {
      addRect(slide, item.x + 1.48, 2.91, 0.46, 0.07, C.blue, C.blue);
      addRect(slide, item.x + 1.48, 3.08, 0.3, 0.07, C.teal, C.teal);
      addRect(slide, item.x + 1.48, 3.25, 0.44, 0.07, C.gold, C.gold);
    } else {
      addCircle(slide, item.x + 1.43, 2.91, 0.13, C.green, C.green);
      addLine(slide, item.x + 1.55, 2.98, 0.2, 0, C.gold, 2.5);
      addLine(slide, item.x + 1.75, 2.98, 0, 0.2, C.gold, 2.5);
      addLine(slide, item.x + 1.75, 3.18, 0.27, 0, C.gold, 2.5);
      addCircle(slide, item.x + 2.01, 3.12, 0.13, C.coral, C.coral);
    }
    addText(slide, item.title, item.x + 0.32, 3.82, 2.78, 0.28, { fontSize: 12.5, bold: true, color: item.color, align: "center", charSpacing: 0.8 });
    addText(slide, item.question, item.x + 0.36, 4.29, 2.7, 0.58, { fontFace: FONT_HEAD, fontSize: 17.5, align: "center", valign: "top", breakLine: true });
  });

  addLine(slide, 1.58, 5.82, 10.1, 0, C.line, 1);
  addRichText(slide, [
    { text: "Cilj rada: " , options: { color: C.brown, bold: true } },
    { text: "objediniti ova iskustva u jednom proverljivom nastavnom alatu." }
  ], 1.2, 6.08, 10.9, 0.48, { fontFace: FONT_BODY, fontSize: 17.5, align: "center" });
  addNotes(slide, "Polazni problem nije samo pronalaženje puta. Postojeći vizualizatori uglavnom dobro prikazuju tok jednog algoritma, ali često razdvajaju ono što je za razumevanje potrebno zajedno: posmatranje, direktno poređenje, merenje i samostalno rešavanje. Cilj rada bio je da se ta iskustva objedine u jednom nastavnom alatu.");
}

{
  const slide = addBaseSlide(3, "Rešenje");
  addTitle(slide, "Pathfinder povezuje tri nivoa učenja.");
  addText(slide, "ISTA TRI PITANJA, SADA KAO JEDAN TOK", 0.82, 1.48, 5.8, 0.24, { fontSize: 10.5, bold: true, color: C.brown, charSpacing: 1.1 });
  const stages = [
    { x: 0.75, number: "01", title: "Vizualizacija", question: "Kako radi?", body: "Izvršavanje korak po korak", color: C.blue },
    { x: 5.07, number: "02", title: "Poređenje", question: "Zašto se razlikuje?", body: "Ista mapa i ista merila", color: C.teal },
    { x: 9.39, number: "03", title: "Igraonica", question: "Kako se znanje primenjuje?", body: "Sopstveni put i povratna informacija", color: C.gold }
  ];

  stages.forEach((stage, index) => {
    addRoundRect(slide, stage.x, 2.03, 3.19, 3.11, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.1, blur: 1.5, angle: 45, distance: 0.7 } });
    addRect(slide, stage.x, 2.03, 3.19, 0.07, stage.color, stage.color);
    addCircle(slide, stage.x + 0.25, 2.38, 0.54, { color: stage.color, transparency: 84 }, stage.color, { line: { color: stage.color, width: 1.1 } });
    addText(slide, stage.number, stage.x + 0.25, 2.48, 0.54, 0.28, { fontFace: FONT_HEAD, fontSize: 15, bold: true, color: stage.color, align: "center" });
    addText(slide, stage.title, stage.x + 0.97, 2.42, 1.92, 0.38, { fontFace: FONT_HEAD, fontSize: 20.5, color: C.ink });
    addText(slide, stage.question, stage.x + 0.3, 3.35, 2.59, 0.42, { fontSize: 15.5, bold: true, color: stage.color, align: "center" });
    addLine(slide, stage.x + 0.52, 3.91, 2.15, 0, C.line, 1);
    addText(slide, stage.body, stage.x + 0.35, 4.17, 2.49, 0.52, { fontSize: 14, color: C.muted, align: "center", valign: "top", breakLine: true });
    if (index < stages.length - 1) addArrow(slide, stage.x + 3.42, 3.56, 0.57, 0, C.brown, 1.5);
  });

  addRoundRect(slide, 1.72, 5.6, 9.9, 0.76, C.soft, C.soft);
  addText(slide, "Od posmatrača do učesnika, bez promene okruženja.", 2.02, 5.79, 9.3, 0.34, { fontFace: FONT_HEAD, fontSize: 18.5, color: C.deepBrown, align: "center" });
  addNotes(slide, "Rešenje je organizovano kao progresija. Vizualizacija odgovara na pitanje kako jedan algoritam radi. Poređenje pokazuje zašto se više algoritama ponaša različito na istom problemu. Igraonica zatim pretvara korisnika iz posmatrača u učesnika: put se konstruiše ručno, a sistem proverava ispravnost, cenu i kvalitet rešenja.");
}

{
  const slide = addBaseSlide(4, "Aplikacija");
  addTitle(slide, "Sistem u radu", { fontSize: 29 });
  addText(slide, "Mapa, trag izvršavanja, kontrole i metrike ostaju u istom vidnom polju.", 4.38, 0.92, 8.15, 0.34, {
    fontSize: 15,
    color: C.muted,
    align: "right"
  });
  addRoundRect(slide, 1.03, 1.48, 11.27, 5.25, C.surface, C.line, { shadow: { type: "outer", color: "A99A8D", opacity: 0.16, blur: 2, angle: 45, distance: 1 } });
  addImage(slide, thesisImage("snimak-5-2-2.png"), 1.28, 1.76, 10.77, 4.69, "contain", "Pathfinder aplikacija tokom vizualizacije algoritma");
  addRoundRect(slide, 1.03, 1.48, 11.27, 5.25, { color: C.white, transparency: 100 }, { color: C.line, width: 1.2 });
  addNotes(slide, "Na glavnom ekranu centralno mesto zauzima mapa. Sa leve strane je legenda, sa desne merene vrednosti, a kontrole ostaju iznad mreže. Korisnik može da crta prepreke i težinski teren, pokrene ili premota izvršavanje, generiše mape i zatraži objašnjenje. Isti raspored se zadržava kroz sva tri režima, kako bi pažnja ostala na ponašanju algoritma.");
}

{
  const slide = addBaseSlide(5, "Arhitektura i tehnologije");
  addTitle(slide, "Jedan tok, četiri jasno odvojene odgovornosti.", { fontSize: 28 });
  addText(slide, "Klijent prikazuje, server orkestrira, servisi čuvaju i objašnjavaju.", 0.74, 1.46, 10.8, 0.36, { fontSize: 16.5, color: C.muted });

  addArrow(slide, 4.12, 3.39, 0.68, 0, C.brown, 1.6);
  addText(slide, "REST · SOCKET.IO", 4.02, 2.98, 0.9, 0.2, { fontSize: 8, bold: true, color: C.brown, align: "center", charSpacing: 0.5 });
  addArrow(slide, 8.48, 3.39, 0.68, 0, C.brown, 1.6);
  addText(slide, "PODACI · KONTEKST", 8.39, 2.98, 0.88, 0.2, { fontSize: 8, bold: true, color: C.brown, align: "center", charSpacing: 0.35 });

  addRoundRect(slide, 0.72, 1.92, 3.18, 3.52, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.11, blur: 1.5, angle: 45, distance: 0.7 } });
  addCircle(slide, 1.02, 2.22, 0.76, { color: C.blue, transparency: 84 }, C.blue, { line: { color: C.blue, width: 1.2 } });
  addMiniGrid(slide, 1.17, 2.42, 3, 2, 0.15, new Map([["0,1", C.blue], ["1,1", C.violet], ["2,0", C.gold]]));
  addText(slide, "01  KLIJENT", 1.98, 2.27, 1.55, 0.24, { fontSize: 10.5, bold: true, color: C.blue, charSpacing: 0.8 });
  addText(slide, "Angular + TypeScript", 1.02, 3.12, 2.58, 0.36, { fontFace: FONT_HEAD, fontSize: 19.5 });
  addText(slide, "Canvas prikaz", 1.02, 3.64, 2.58, 0.3, { fontSize: 15, bold: true, color: C.blue });
  addLine(slide, 1.02, 4.14, 2.42, 0, C.line, 1);
  addText(slide, "interakcija  ·  trag  ·  animacija", 1.02, 4.42, 2.48, 0.5, { fontSize: 13.5, color: C.muted, align: "center" });

  addRoundRect(slide, 5.0, 1.72, 3.32, 3.92, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.14, blur: 1.8, angle: 45, distance: 0.8 } });
  addCircle(slide, 6.27, 2.03, 0.78, { color: C.coral, transparency: 84 }, C.coral, { line: { color: C.coral, width: 1.2 } });
  addText(slide, "API", 6.27, 2.23, 0.78, 0.25, { fontSize: 10.5, bold: true, color: C.coral, align: "center" });
  addText(slide, "02  SERVER", 5.32, 2.91, 2.68, 0.24, { fontSize: 10.5, bold: true, color: C.coral, align: "center", charSpacing: 0.8 });
  addText(slide, "Node.js + Express", 5.32, 3.3, 2.68, 0.36, { fontFace: FONT_HEAD, fontSize: 19.5, align: "center" });
  ["pokreće algoritme", "beleži merenja", "priprema AI kontekst"].forEach((label, index) => {
    addCircle(slide, 5.53, 4.02 + index * 0.4, 0.13, C.coral, C.coral);
    addText(slide, label, 5.83, 3.94 + index * 0.4, 2.05, 0.28, { fontSize: 12.5, color: C.muted });
  });

  addRoundRect(slide, 9.42, 1.92, 3.18, 3.52, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.11, blur: 1.5, angle: 45, distance: 0.7 } });
  addText(slide, "03  SERVISI", 9.74, 2.22, 2.54, 0.24, { fontSize: 10.5, bold: true, color: C.teal, charSpacing: 0.8 });
  addRoundRect(slide, 9.75, 2.7, 2.52, 0.98, { color: C.green, transparency: 89 }, { color: C.green, transparency: 45 });
  addCircle(slide, 9.98, 2.95, 0.43, C.green, C.green);
  addText(slide, "DB", 9.98, 3.05, 0.43, 0.18, { fontSize: 8.5, bold: true, color: C.white, align: "center" });
  addText(slide, "MongoDB", 10.59, 2.86, 1.4, 0.24, { fontFace: FONT_HEAD, fontSize: 16.5, color: C.green });
  addText(slide, "trajni podaci", 10.59, 3.18, 1.38, 0.2, { fontSize: 11.5, color: C.muted });
  addRoundRect(slide, 9.75, 3.97, 2.52, 0.98, { color: C.violet, transparency: 90 }, { color: C.violet, transparency: 45 });
  addCircle(slide, 9.98, 4.22, 0.43, C.violet, C.violet);
  addText(slide, "AI", 9.98, 4.32, 0.43, 0.18, { fontSize: 8.5, bold: true, color: C.white, align: "center" });
  addText(slide, "AI servis", 10.59, 4.13, 1.4, 0.24, { fontFace: FONT_HEAD, fontSize: 16.5, color: C.violet });
  addText(slide, "jezička objašnjenja", 10.59, 4.45, 1.38, 0.28, { fontSize: 11.5, color: C.muted, breakLine: true });

  addArrow(slide, 6.66, 5.7, 0, 0.36, C.brown, 1.4);
  addRoundRect(slide, 4.47, 6.06, 4.38, 0.52, C.soft, C.soft);
  addText(slide, "PYTHON  ·  statistička obrada nakon eksperimenata", 4.7, 6.19, 3.92, 0.24, { fontSize: 11.5, bold: true, color: C.deepBrown, align: "center" });
  addNotes(slide, "Klijentski deo je realizovan u Angular-u i TypeScript-u, a mreža se crta na Canvas-u radi efikasnog prikaza velikog broja ćelija. Node.js i Express čine serverski sloj za naloge, čuvanje, bodovanje, brza izvršavanja i komunikaciju sa AI servisom. MongoDB obezbeđuje trajne podatke, Socket.IO osvežava rang-listu, a Python se koristi nakon eksperimenata za statističku obradu i grafikone.");
}

{
  const slide = addBaseSlide(6, "Ključna implementaciona odluka");
  addTitle(slide, "Algoritam ne crta ekran. On govori jezikom događaja.", { fontSize: 28 });
  addText(slide, "Jedan standardizovan trag razdvaja logiku pretrage od reprodukcije.", 0.74, 1.47, 9.6, 0.38, { fontSize: 16.5, color: C.muted });

  addRoundRect(slide, 0.78, 2.18, 2.76, 2.22, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.1, blur: 1.3, angle: 45, distance: 0.6 } });
  addCircle(slide, 1.76, 2.49, 0.8, { color: C.brown, transparency: 84 }, C.brown, { line: { color: C.brown, width: 1.2 } });
  addText(slide, "step()", 1.76, 2.7, 0.8, 0.25, { fontFace: FONT_HEAD, fontSize: 13.5, bold: true, color: C.brown, align: "center" });
  addText(slide, "ALGORITAM", 1.08, 3.47, 2.16, 0.24, { fontSize: 10.5, bold: true, color: C.brown, align: "center", charSpacing: 1 });
  addText(slide, "menja svoje stanje", 1.08, 3.81, 2.16, 0.28, { fontSize: 13.5, color: C.muted, align: "center" });

  addArrow(slide, 3.79, 3.27, 0.74, 0, C.brown, 1.7);
  addText(slide, "emit()", 3.85, 2.88, 0.62, 0.2, { fontSize: 8.5, bold: true, color: C.brown, align: "center" });

  addRoundRect(slide, 4.79, 1.96, 3.76, 2.66, C.soft2, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.12, blur: 1.5, angle: 45, distance: 0.7 } });
  addText(slide, "ZAJEDNIČKI TRAG", 5.13, 2.24, 3.08, 0.24, { fontSize: 10.5, bold: true, color: C.deepBrown, align: "center", charSpacing: 0.9 });
  [
    { label: "OTVOREN ČVOR", color: C.blue },
    { label: "OBRAĐEN ČVOR", color: C.violet },
    { label: "PRONAĐEN PUT", color: C.gold }
  ].forEach((event, index) => {
    addRoundRect(slide, 5.27, 2.77 + index * 0.48, 2.8, 0.34, C.surface, C.line);
    addCircle(slide, 5.47, 2.87 + index * 0.48, 0.13, event.color, event.color);
    addText(slide, event.label, 5.76, 2.83 + index * 0.48, 1.98, 0.2, { fontSize: 9.5, bold: true, color: event.color, charSpacing: 0.45 });
  });

  addArrow(slide, 8.81, 3.27, 0.74, 0, C.brown, 1.7);
  addText(slide, "reprodukuj", 8.78, 2.88, 0.8, 0.2, { fontSize: 8.5, bold: true, color: C.brown, align: "center" });

  addRoundRect(slide, 9.8, 2.18, 2.76, 2.22, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.1, blur: 1.3, angle: 45, distance: 0.6 } });
  addMiniGrid(slide, 10.73, 2.55, 5, 3, 0.19, new Map([["0,1", C.green], ["1,1", C.blue], ["2,1", C.violet], ["3,1", C.gold], ["4,1", C.coral]]));
  addText(slide, "CANVAS PRIKAZ", 10.1, 3.47, 2.16, 0.24, { fontSize: 10.5, bold: true, color: C.teal, align: "center", charSpacing: 0.9 });
  addText(slide, "prikazuje isto stanje", 10.1, 3.81, 2.16, 0.28, { fontSize: 13.5, color: C.muted, align: "center" });

  addRoundRect(slide, 0.88, 5.15, 11.57, 1.02, C.soft2, C.soft2);
  const controls = [
    { symbol: "▶", label: "Pokreni" },
    { symbol: "Ⅱ", label: "Pauziraj" },
    { symbol: "→|", label: "Korak" },
    { symbol: "↶", label: "Nazad" },
    { symbol: "↔", label: "Premotaj" }
  ];
  controls.forEach((control, index) => {
    const x = 1.13 + index * 2.24;
    addCircle(slide, x, 5.42, 0.45, index === 3 ? C.coral : C.brown, index === 3 ? C.coral : C.brown);
    addText(slide, control.symbol, x, 5.51, 0.45, 0.22, { fontSize: 11, bold: true, color: C.white, align: "center" });
    addText(slide, control.label, x + 0.58, 5.48, 1.28, 0.26, { fontSize: 12.5, bold: true });
  });
  addText(slide, "Novi algoritam se priključuje čim emituje isti skup događaja.", 2.13, 6.42, 9.1, 0.3, { fontFace: FONT_HEAD, fontSize: 17.5, color: C.deepBrown, align: "center" });
  addNotes(slide, "Centralna implementaciona odluka jeste potpuno razdvajanje algoritma od prikaza. Svaki korak algoritma emituje standardizovane događaje, na primer otkriven čvor, obrađen čvor ili pronađen put. Prikaz samo reprodukuje trag. Tako su omogućeni pauza, korak napred, korak nazad i premotavanje, a dodavanje novog algoritma ne zahteva novu logiku crtanja.");
}

{
  const slide = addBaseSlide(7, "Veštačka inteligencija");
  addTitle(slide, "Program računa. AI objašnjava.");
  addText(slide, "API tok čuva proverljive činjenice između korisničkog zahteva i objašnjenja.", 0.74, 1.47, 11.2, 0.38, { fontSize: 16.5, color: C.muted });

  addArrow(slide, 3.06, 3.37, 0.43, 0, C.brown, 1.6);
  addText(slide, "zahtev", 2.98, 3.0, 0.58, 0.18, { fontSize: 8.5, bold: true, color: C.brown, align: "center" });
  addArrow(slide, 6.94, 3.37, 0.44, 0, C.brown, 1.6);
  addRoundRect(slide, 6.82, 2.83, 0.69, 0.32, C.soft, C.soft);
  addText(slide, "POST /api/ai/*", 6.85, 2.91, 0.63, 0.14, { fontSize: 6.8, bold: true, color: C.deepBrown, align: "center" });
  addArrow(slide, 9.92, 3.37, 0.4, 0, C.brown, 1.6);
  addText(slide, "JSON", 9.89, 3.0, 0.47, 0.18, { fontSize: 8.5, bold: true, color: C.brown, align: "center" });

  addRoundRect(slide, 0.72, 2.22, 2.26, 2.36, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.1, blur: 1.3, angle: 45, distance: 0.6 } });
  addCircle(slide, 1.55, 2.53, 0.6, { color: C.blue, transparency: 82 }, C.blue, { line: { color: C.blue, width: 1.2 } });
  addText(slide, "?", 1.55, 2.65, 0.6, 0.28, { fontFace: FONT_HEAD, fontSize: 18, bold: true, color: C.blue, align: "center" });
  addText(slide, "KORISNIČKI ZAHTEV", 0.97, 3.42, 1.76, 0.24, { fontSize: 9.5, bold: true, color: C.blue, align: "center", charSpacing: 0.7 });
  addText(slide, "Šta se dogodilo?", 0.97, 3.82, 1.76, 0.34, { fontFace: FONT_HEAD, fontSize: 16, align: "center" });

  addRoundRect(slide, 3.55, 1.96, 3.31, 2.88, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.14, blur: 1.6, angle: 45, distance: 0.7 } });
  addText(slide, "PATHFINDER SERVER", 3.9, 2.27, 2.61, 0.24, { fontSize: 10.5, bold: true, color: C.teal, align: "center", charSpacing: 0.8 });
  [
    "pokreće algoritam",
    "proverava put i cenu",
    "izdvaja ključne trenutke"
  ].forEach((label, index) => {
    addCircle(slide, 3.98, 2.94 + index * 0.53, 0.22, C.teal, C.teal);
    addText(slide, "✓", 3.98, 2.98 + index * 0.53, 0.22, 0.16, { fontSize: 8.5, bold: true, color: C.white, align: "center" });
    addText(slide, label, 4.4, 2.9 + index * 0.53, 2.0, 0.26, { fontSize: 12.5, color: C.ink });
  });

  addRoundRect(slide, 7.46, 2.22, 2.36, 2.36, { color: C.violet, transparency: 91 }, { color: C.violet, transparency: 30 });
  addCircle(slide, 8.3, 2.53, 0.68, C.violet, C.violet);
  addText(slide, "AI", 8.3, 2.7, 0.68, 0.24, { fontSize: 11, bold: true, color: C.white, align: "center" });
  addText(slide, "JEZIČKI MODEL", 7.76, 3.42, 1.76, 0.24, { fontSize: 9.5, bold: true, color: C.violet, align: "center", charSpacing: 0.7 });
  addText(slide, "objašnjava kontekst", 7.71, 3.82, 1.86, 0.34, { fontFace: FONT_HEAD, fontSize: 15.5, align: "center" });

  addRoundRect(slide, 10.4, 2.22, 2.2, 2.36, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.1, blur: 1.3, angle: 45, distance: 0.6 } });
  addText(slide, "OBJAŠNJENJE", 10.67, 2.53, 1.66, 0.24, { fontSize: 9.5, bold: true, color: C.brown, align: "center", charSpacing: 0.7 });
  ["Tutor", "Generator", "Preporuka", "Pomoć"].forEach((label, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    addRoundRect(slide, 10.68 + column * 0.76, 3.08 + row * 0.56, 0.68, 0.36, index % 2 ? { color: C.violet, transparency: 88 } : C.soft2, C.line);
    addText(slide, label, 10.7 + column * 0.76, 3.16 + row * 0.56, 0.64, 0.18, { fontSize: 8.5, bold: true, color: index % 2 ? C.violet : C.deepBrown, align: "center" });
  });

  addRoundRect(slide, 1.65, 5.56, 10.03, 0.7, C.soft, C.soft);
  addText(slide, "Tačno objašnjenje počinje tačnim, programski proverenim kontekstom.", 1.98, 5.74, 9.37, 0.32, { fontFace: FONT_HEAD, fontSize: 17.5, color: C.deepBrown, align: "center" });
  addNotes(slide, "Veštačka inteligencija nije postavljena kao kalkulator niti kao konačni autoritet. Server prvo pokreće algoritme, proverava put, računa metrike ili bira ključne trenutke. Jezički model dobija taj provereni kontekst i pretvara ga u razumljivo objašnjenje. Ovaj obrazac se koristi u Tutoru, Generatoru, Preporuci i kontekstualnoj pomoći.");
}

{
  const slide = addBaseSlide(8, "Metodologija istraživanja");
  addTitle(slide, "Od pitanja do merljivog rezultata.");
  addText(slide, "Metodologija pretvara demonstraciju u podatke koji mogu da se porede.", 0.74, 1.47, 10.7, 0.38, { fontSize: 16.5, color: C.muted });
  addRoundRect(slide, 10.58, 0.92, 1.79, 0.38, { color: C.teal, transparency: 88 }, C.teal);
  addText(slide, "UVOD U METRIKE  →", 10.7, 1.01, 1.55, 0.18, { fontSize: 8.7, bold: true, color: C.teal, align: "center", charSpacing: 0.35 });

  const steps = [
    { x: 0.78, title: "Pitanje", body: "šta se menja?", color: C.brown },
    { x: 3.15, title: "Scenario", body: "isti seed i mapa", color: C.blue },
    { x: 5.52, title: "Pokretanje", body: "isti uslovi", color: C.teal },
    { x: 7.89, title: "Sirovi podaci", body: "svaki rezultat", color: C.gold },
    { x: 10.26, title: "Zaključak", body: "statistička obrada", color: C.violet }
  ];
  steps.forEach((step, index) => {
    addStepBadge(slide, index + 1, step.x + 0.69, 2.31, step.color);
    addText(slide, step.title, step.x, 3.0, 1.88, 0.34, { fontFace: FONT_HEAD, fontSize: 17, align: "center" });
    addText(slide, step.body, step.x, 3.49, 1.88, 0.34, { fontSize: 13, color: C.muted, align: "center" });
    if (index < steps.length - 1) addArrow(slide, step.x + 1.83, 2.55, 0.49, 0, C.line, 1.5);
  });

  addLine(slide, 0.82, 4.31, 11.68, 0, C.line, 1);
  const counts = [
    { x: 1.02, value: "9.444", label: "simulacije algoritama", color: C.brown },
    { x: 4.72, value: "11.250", label: "simulacije bodovanja", color: C.gold },
    { x: 8.42, value: "430", label: "poziva ka pet AI modela", color: C.violet }
  ];
  counts.forEach(count => {
    addRoundRect(slide, count.x, 4.67, 2.88, 1.12, C.surface, C.line);
    addText(slide, count.value, count.x, 4.79, 2.88, 0.5, { fontFace: FONT_HEAD, fontSize: 29, color: count.color, align: "center" });
    addText(slide, count.label, count.x + 0.15, 5.3, 2.58, 0.26, { fontSize: 12.5, color: C.muted, align: "center" });
  });
  addRoundRect(slide, 1.42, 6.08, 10.48, 0.58, C.soft, C.soft);
  addText(slide, "Sirovi podaci  →  prošireni čvorovi · frontijer · cena · suboptimalnost", 1.72, 6.23, 9.88, 0.28, { fontSize: 14, bold: true, color: C.deepBrown, align: "center" });
  addNotes(slide, "Za evaluaciju je napravljen poseban benchmark podsistem. Tok počinje istraživačkim pitanjem, zatim se menja jedna kontrolisana osobina scenarija, čuvaju se sirovi rezultati svakog pokretanja i tek potom se rade statistička obrada i zaključivanje. Obim je obuhvatio 9.444 simulacije algoritama, 11.250 simulacija bodovnog sistema i 430 poziva ka pet jezičkih modela.");
}

{
  const slide = addBaseSlide(9, "Metrike");
  addTitle(slide, "Nijedna metrika nije dovoljna sama.");

  const metrics = [
    { x: 0.82, y: 2.08, title: "Prošireni čvorovi", body: "količina istraženog prostora", kind: "expanded", color: C.blue },
    { x: 6.72, y: 2.08, title: "Maksimalni frontijer", body: "vršna veličina skupa čekanja", kind: "frontier", color: C.violet },
    { x: 0.82, y: 4.33, title: "Stvarna cena puta", body: "zbir troškova izabrane putanje", kind: "cost", color: C.gold },
    { x: 6.72, y: 4.33, title: "Suboptimalnost", body: "odstupanje od referentne cene", kind: "suboptimality", color: C.teal }
  ];

  metrics.forEach(metric => {
    addRoundRect(slide, metric.x, metric.y, 5.62, 1.78, C.surface, C.line);
    addMetricIllustration(slide, metric.kind, metric.x + 0.3, metric.y + 0.37, metric.color);
    addText(slide, metric.title, metric.x + 1.7, metric.y + 0.32, 3.5, 0.34, { fontFace: FONT_HEAD, fontSize: 19 });
    addText(slide, metric.body, metric.x + 1.7, metric.y + 0.84, 3.5, 0.58, { fontSize: 14, color: C.muted, valign: "top", breakLine: true });
  });
  addText(slide, "Vreme izvršavanja je dopunska mera jer zavisi od hardvera i okruženja.", 2.23, 6.4, 8.9, 0.32, { fontSize: 14, bold: true, color: C.deepBrown, align: "center" });
  addNotes(slide, "Četiri mere nose glavno tumačenje. Broj proširenih čvorova opisuje količinu rada. Maksimalni frontijer daje približnu sliku memorijskog pritiska. Stvarna cena puta ponovo se računa istim pravilom za sve algoritme. Suboptimalnost pokazuje koliko taj put odstupa od Dijkstrine referentne cene. Vreme je zadržano kao dopuna, ali ne kao jedini kriterijum, jer zavisi od računara i trenutnog opterećenja.");
}

{
  const slide = addBaseSlide(10, "Glavni rezultat");
  addTitle(slide, "A* zadržava kvalitet uz znatno manje istraživanja.", { fontSize: 28 });
  addText(slide, "Oba algoritma pronalaze isti najjeftiniji put.", 0.74, 1.47, 9.8, 0.38, { fontSize: 17, color: C.muted });

  const barX = 2.35;
  const fullWidth = 6.3;
  addText(slide, "Dijkstra", 0.82, 2.5, 1.2, 0.36, { fontSize: 16, bold: true, align: "right" });
  addRoundRect(slide, barX, 2.35, fullWidth, 0.72, C.soft, C.soft);
  addRoundRect(slide, barX, 2.35, fullWidth, 0.72, C.brown, C.brown);
  addText(slide, "584", 8.91, 2.45, 0.72, 0.42, { fontFace: FONT_HEAD, fontSize: 23, color: C.deepBrown, align: "right" });

  addText(slide, "A*", 0.82, 3.88, 1.2, 0.36, { fontSize: 16, bold: true, align: "right" });
  addRoundRect(slide, barX, 3.73, fullWidth, 0.72, C.soft, C.soft);
  addRoundRect(slide, barX, 3.73, fullWidth * 0.375, 0.72, C.teal, C.teal);
  addText(slide, "219", 8.91, 3.83, 0.72, 0.42, { fontFace: FONT_HEAD, fontSize: 23, color: C.teal, align: "right" });
  addText(slide, "prosečan broj proširenih čvorova", 2.35, 4.75, 6.3, 0.28, { fontSize: 12.5, color: C.muted, align: "center" });

  addLine(slide, 9.91, 2.1, 0, 3.25, C.line, 1);
  addText(slide, "62,5%", 10.23, 2.23, 2.0, 0.83, { fontFace: FONT_HEAD, fontSize: 43, color: C.coral, align: "center" });
  addText(slide, "manje istraživanja", 10.2, 3.1, 2.07, 0.34, { fontSize: 16.5, bold: true, align: "center" });
  addRoundRect(slide, 10.25, 3.82, 1.96, 0.53, { color: C.teal, transparency: 86 }, C.teal);
  addText(slide, "0% suboptimalnosti", 10.32, 3.94, 1.82, 0.27, { fontSize: 12, bold: true, color: C.teal, align: "center" });
  addText(slide, "Heuristika usmerava potragu, ali ne menja cilj.", 10.14, 4.77, 2.24, 0.65, { fontFace: FONT_HEAD, fontSize: 16.5, color: C.deepBrown, align: "center", valign: "top", breakLine: true });

  addNotes(slide, "Najjasniji rezultat je poređenje Dijkstre i A*. Oba algoritma su u zbirnom eksperimentu imala nultu suboptimalnost, dakle vraćala su najjeftiniji put. A* je ipak prosečno proširio oko 219 čvorova, naspram 584 kod Dijkstre, što predstavlja 62,5 odsto manje istraživanja. Heuristika je usmerila pretragu bez gubitka kvaliteta.");
}

{
  const slide = addBaseSlide(11, "Drugi rezultat");
  addTitle(slide, "Swarm smanjuje rad uz malu suboptimalnost.", { fontSize: 28 });
  addText(slide, "Zbirni eksperiment pokazuje merljiv kompromis brzine i kvaliteta.", 0.74, 1.47, 10.4, 0.38, { fontSize: 16.5, color: C.muted });

  addRoundRect(slide, 0.82, 2.06, 5.67, 3.75, C.surface, C.line);
  addText(slide, "KOLIČINA ISTRAŽIVANJA", 1.16, 2.39, 4.99, 0.24, { fontSize: 10.5, bold: true, color: C.brown, charSpacing: 0.8 });
  addText(slide, "A*", 1.17, 3.12, 0.72, 0.28, { fontSize: 14, bold: true });
  addRoundRect(slide, 2.02, 3.04, 3.35, 0.48, C.soft, C.soft);
  addRoundRect(slide, 2.02, 3.04, 3.35, 0.48, C.teal, C.teal);
  addText(slide, "219", 5.48, 3.08, 0.56, 0.32, { fontFace: FONT_HEAD, fontSize: 19, color: C.teal, align: "right" });
  addText(slide, "Swarm", 1.17, 4.08, 0.72, 0.28, { fontSize: 14, bold: true });
  addRoundRect(slide, 2.02, 4.0, 3.35, 0.48, C.soft, C.soft);
  addRoundRect(slide, 2.02, 4.0, 1.89, 0.48, C.violet, C.violet);
  addText(slide, "123,5", 5.36, 4.04, 0.68, 0.32, { fontFace: FONT_HEAD, fontSize: 19, color: C.violet, align: "right" });
  addText(slide, "43,5% manje proširenih čvorova", 1.2, 5.05, 4.9, 0.38, { fontFace: FONT_HEAD, fontSize: 20, color: C.violet, align: "center" });

  addRoundRect(slide, 6.82, 2.06, 5.51, 3.75, C.surface, C.line);
  addText(slide, "ODSTUPANJE OD OPTIMUMA", 7.16, 2.39, 4.83, 0.24, { fontSize: 10.5, bold: true, color: C.brown, charSpacing: 0.8 });
  addLine(slide, 7.45, 3.55, 3.9, 0, C.line, 5);
  addCircle(slide, 8.0, 3.23, 0.64, C.teal, C.teal);
  addText(slide, "0%", 7.74, 3.38, 1.16, 0.3, { fontFace: FONT_HEAD, fontSize: 17, bold: true, color: C.white, align: "center" });
  addCircle(slide, 10.2, 3.23, 0.64, C.violet, C.violet);
  addText(slide, "2,97%", 9.94, 3.38, 1.16, 0.3, { fontFace: FONT_HEAD, fontSize: 15.5, bold: true, color: C.white, align: "center" });
  addText(slide, "A*", 7.74, 4.02, 1.16, 0.24, { fontSize: 12.5, bold: true, color: C.teal, align: "center" });
  addText(slide, "Swarm", 9.94, 4.02, 1.16, 0.24, { fontSize: 12.5, bold: true, color: C.violet, align: "center" });
  addText(slide, "malo odstupanje za veliku uštedu", 7.18, 5.05, 4.79, 0.38, { fontFace: FONT_HEAD, fontSize: 20, color: C.deepBrown, align: "center" });

  addRoundRect(slide, 2.25, 6.12, 8.83, 0.55, C.soft, C.soft);
  addText(slide, "Težina heuristike pomera odnos između brzine i optimalnosti.", 2.54, 6.26, 8.25, 0.27, { fontSize: 14, bold: true, color: C.deepBrown, align: "center" });
  addNotes(slide, "Drugi važan rezultat pokazuje kompromis. U zbirnom eksperimentu A* je prosečno proširio 218,74 čvora uz nultu suboptimalnost. Swarm je proširio 123,50 čvorova, odnosno 43,5 odsto manje, uz prosečnu suboptimalnost od 2,97 odsto. Povećanjem težine heuristike dobija se brzina, ali se napušta stroga garancija optimalnosti.");
}

{
  const slide = addBaseSlide(12, "Zanimljivi nalazi");
  addTitle(slide, "Osam algoritama, osam različitih kompromisa.", { fontSize: 28 });
  addText(slide, "Isti problem se istražuje različitim redosledom i sa različitim garancijama.", 0.74, 1.47, 11.1, 0.36, { fontSize: 16, color: C.muted });

  const findings = [
    { label: "BFS", glyph: "FIFO", fact: "najkraći po koracima", color: C.blue },
    { label: "DFS", glyph: "LIFO", fact: "dubina bez optimalnosti", color: C.violet },
    { label: "Dijkstra", glyph: "g", fact: "referentna najniža cena", color: C.brown },
    { label: "A*", glyph: "g+h", fact: "optimalnost uz heuristiku", color: C.teal },
    { label: "Greedy", glyph: "h", fact: "minimum rada, veći rizik", color: C.coral },
    { label: "Swarm", glyph: "w₁", fact: "kompromis rada i cene", color: C.green },
    { label: "Conv. Swarm", glyph: "w₂", fact: "agresivnija heuristika", color: C.deepBrown },
    { label: "0–1 BFS", glyph: "0|1", fact: "specijalista za 0/1 težine", color: C.gold }
  ];

  findings.forEach((finding, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = 0.72 + column * 3.08;
    const y = 2.02 + row * 2.06;
    addRoundRect(slide, x, y, 2.76, 1.72, C.surface, C.line, { shadow: { type: "outer", color: "B9AA9B", opacity: 0.08, blur: 1.1, angle: 45, distance: 0.5 } });
    addAlgorithmGlyph(slide, finding.glyph, x + 0.25, y + 0.31, finding.color);
    addText(slide, finding.label, x + 1.05, y + 0.31, 1.45, 0.3, { fontSize: 13.5, bold: true, color: finding.color });
    addLine(slide, x + 1.05, y + 0.78, 1.39, 0, C.line, 1);
    addText(slide, finding.fact, x + 0.25, y + 1.02, 2.26, 0.42, { fontFace: FONT_HEAD, fontSize: 13.5, color: C.ink, align: "center", breakLine: true });
  });
  addText(slide, "Izbor algoritma je izbor prioriteta: garancija, brzina, memorija ili specifičan model težina.", 1.18, 6.4, 10.98, 0.3, { fontFace: FONT_HEAD, fontSize: 17.5, color: C.deepBrown, align: "center" });
  addNotes(slide, "Svaki od osam algoritama ima smisla u odgovarajućem kontekstu. BFS garantuje najkraći broj koraka na neponderisanom grafu. DFS je dubinski i ne garantuje optimalnost. Dijkstra je referenca za najnižu cenu. A* zadržava optimalnost uz odgovarajuću heuristiku. Greedy daje najmanje rada, ali veći rizik suboptimalnosti. Swarm i Convergent Swarm pomeraju kompromis ka brzini, dok je 0–1 BFS specijalista isključivo za binarne težine.");
}

{
  const slide = addBaseSlide(13, "Obim evaluacije");
  addTitle(slide, "Četiri nivoa daju potpuniju sliku sistema.");
  const areas = [
    { x: 0.82, title: "Algoritmi", body: "9.444 simulacije", color: C.blue },
    { x: 3.78, title: "Igraonica", body: "11.250 profila", color: C.gold },
    { x: 6.74, title: "AI sloj", body: "430 poziva", color: C.violet },
    { x: 9.7, title: "Interfejs", body: "10 heuristika", color: C.teal }
  ];
  addLine(slide, 1.97, 2.54, 8.88, 0, C.line, 2);
  areas.forEach((area, index) => {
    addRoundRect(slide, area.x, 1.92, 2.62, 2.87, C.surface, C.line);
    addStepBadge(slide, index + 1, area.x + 1.07, 2.3, area.color);
    addText(slide, area.title, area.x + 0.25, 3.1, 2.12, 0.38, { fontFace: FONT_HEAD, fontSize: 19.5, align: "center" });
    addText(slide, area.body, area.x + 0.32, 3.7, 1.98, 0.66, { fontSize: 14, color: C.muted, align: "center", valign: "top", breakLine: true });
  });

  addRoundRect(slide, 1.33, 5.25, 10.47, 0.94, C.soft, C.soft);
  addText(slide, "JEDAN SISTEM · ČETIRI VRSTE DOKAZA", 1.7, 5.48, 9.73, 0.22, { fontSize: 10.5, bold: true, color: C.brown, align: "center", charSpacing: 1 });
  addText(slide, "ponašanje · bodovanje · AI pouzdanost · upotrebljivost", 1.7, 5.8, 9.73, 0.25, { fontFace: FONT_HEAD, fontSize: 16.5, color: C.deepBrown, align: "center" });
  addNotes(slide, "Evaluacija obuhvata četiri nivoa. Algoritmi su provereni kroz 9.444 ponovljive simulacije, bodovanje u Igraonici kroz 11.250 simuliranih profila, AI sloj kroz 430 poziva ka pet modela, a interfejs kroz svih deset Nielsenovih heurističkih principa. Ove četiri perspektive zajedno proveravaju ponašanje celog sistema.");
}

{
  const slide = addBaseSlide(14, "Nielsenova evaluacija");
  addTitle(slide, "Deset heuristika, deset konkretnih odgovora interfejsa.", { fontSize: 27 });
  addText(slide, "Svaki princip je mapiran na proverljiv element aplikacije.", 0.74, 1.44, 10.5, 0.34, { fontSize: 16, color: C.muted });

  const heuristics = [
    { number: 1, title: "Vidljivost statusa sistema", evidence: "stanje, korak i metrike uživo", color: C.blue },
    { number: 6, title: "Prepoznavanje umesto prisećanja", evidence: "stalna legenda i vidljive metrike", color: C.blue },
    { number: 2, title: "Podudaranje sistema i stvarnog sveta", evidence: "mapa, zidovi, start/cilj i SR/EN", color: C.teal },
    { number: 7, title: "Fleksibilnost i efikasnost korišćenja", evidence: "brzina, premotavanje i generatori", color: C.teal },
    { number: 3, title: "Korisnička kontrola i sloboda", evidence: "pauza, korak, povratak i reset", color: C.gold },
    { number: 8, title: "Estetski i minimalistički dizajn", evidence: "Canvas u fokusu, opcije po potrebi", color: C.gold },
    { number: 4, title: "Konzistentnost i standardi", evidence: "iste boje, raspored i termini", color: C.violet },
    { number: 9, title: "Pomoć korisnicima da prepoznaju, dijagnostikuju i reše greške", evidence: "jasne poruke, breakdown i fallback", color: C.violet },
    { number: 5, title: "Prevencija grešaka", evidence: "zaštita čvorova i validacija puta", color: C.coral },
    { number: 10, title: "Pomoć i dokumentacija", evidence: "vodič od 17 koraka i AI Tutor", color: C.coral }
  ];

  heuristics.forEach((heuristic, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = column === 0 ? 0.72 : 6.74;
    const y = 1.94 + row * 0.97;
    addRoundRect(slide, x, y, 5.87, 0.78, C.surface, C.line);
    addRect(slide, x, y, 0.07, 0.78, heuristic.color, heuristic.color);
    addCircle(slide, x + 0.22, y + 0.16, 0.45, heuristic.color, heuristic.color);
    addText(slide, String(heuristic.number), x + 0.22, y + 0.26, 0.45, 0.21, { fontSize: 10, bold: true, color: C.white, align: "center" });
    addText(slide, heuristic.title, x + 0.86, y + 0.12, 4.58, 0.24, { fontSize: heuristic.title.length > 42 ? 9.8 : 11.8, bold: true, color: heuristic.color });
    addText(slide, heuristic.evidence, x + 0.86, y + 0.43, 4.58, 0.2, { fontSize: 10.5, color: C.muted });
  });
  addNotes(slide, "Interfejs je pregledan prema svih deset Nielsenovih heuristika. Status je stalno vidljiv, metafora mape je razumljiva, korisnik kontroliše tok, a boje i raspored ostaju dosledni. Greške se sprečavaju validacijom, potrebne informacije su vidljive, napredne kontrole ubrzavaju rad, Canvas ostaje u fokusu, poruke pomažu oporavku, a vodič i AI Tutor pružaju pomoć u kontekstu.");
}

{
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  addRect(slide, 0, 0, W, 0.075, C.brown, C.brown);
  addText(slide, "ODBRANA MASTER RADA", 0.72, 0.42, 3.2, 0.2, { fontSize: 10, bold: true, color: C.brown, charSpacing: 1.2 });
  addText(slide, "Hvala na pažnji.", 1.15, 1.62, 11.05, 1.0, {
    fontFace: FONT_HEAD,
    fontSize: 37,
    color: C.ink,
    align: "center",
    valign: "mid",
    breakLine: true
  });
  addLine(slide, 4.42, 3.1, 4.49, 0, C.line, 1.2);
  addText(slide, "Pitanja?", 3.12, 3.5, 7.09, 0.92, { fontFace: FONT_HEAD, fontSize: 34, color: C.deepBrown, align: "center" });
  addText(slide, "Predrag Pešić · 2024/3281", 4.42, 5.48, 4.49, 0.3, { fontSize: 13.5, color: C.muted, align: "center" });
  addText(slide, "Interaktivna vizualizacija grafovskih algoritama za pronalaženje puta sa podrškom veštačke inteligencije", 3.0, 5.93, 7.33, 0.62, { fontSize: 12, color: C.muted, align: "center", valign: "top", breakLine: true });
  addLine(slide, 0.72, 7.03, 11.9, 0, C.line, 0.8);
  addText(slide, "15", 12.08, 7.1, 0.54, 0.16, { fontSize: 8.5, bold: true, color: C.muted, align: "right" });
  addNotes(slide, "Pathfinder povezuje vizualizaciju, poređenje, merenje, aktivno rešavanje i AI objašnjenje u jednom proverljivom sistemu. Hvala na pažnji. Otvara se prostor za pitanja komisije.");
}

async function main() {
  await pptx.writeFile({ fileName: outputPath, compression: true });
  const size = fs.statSync(outputPath).size;
  console.log(`Kreiran ${path.basename(outputPath)}: ${pptx._slides.length} slajdova, ${(size / 1024 / 1024).toFixed(2)} MB.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});