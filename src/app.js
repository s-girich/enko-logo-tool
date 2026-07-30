const canvas = document.querySelector("#logoCanvas");
const ctx = canvas.getContext("2d");
const sourceCanvas = document.createElement("canvas");
const sourceCtx = sourceCanvas.getContext("2d");

const SIZE = 1000;
const CENTER = SIZE / 2;
const DEVICE_SCALE = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

canvas.width = SIZE * DEVICE_SCALE;
canvas.height = SIZE * DEVICE_SCALE;
canvas.style.width = "100%";
canvas.style.height = "100%";
ctx.scale(DEVICE_SCALE, DEVICE_SCALE);

sourceCanvas.width = SIZE;
sourceCanvas.height = SIZE;

const inputs = {
  letter: document.querySelector("#letterInput"),
  font: document.querySelector("#fontSelect"),
  template: document.querySelector("#templateSelect"),
  renderMode: document.querySelector("#renderModeSelect"),
  sectors: document.querySelector("#sectorsInput"),
  scale: document.querySelector("#scaleInput"),
  offset: document.querySelector("#offsetInput"),
  refraction: document.querySelector("#refractionInput"),
  density: document.querySelector("#densityInput"),
  rowWeight: document.querySelector("#rowWeightInput"),
  cellGap: document.querySelector("#cellGapInput"),
  fillThreshold: document.querySelector("#fillThresholdInput"),
  ringTwist: document.querySelector("#ringTwistInput"),
  recognition: document.querySelector("#recognitionInput"),
  showGrid: document.querySelector("#gridToggle"),
};

const outputs = {
  sectors: document.querySelector("#sectorsValue"),
  scale: document.querySelector("#scaleValue"),
  offset: document.querySelector("#offsetValue"),
  refraction: document.querySelector("#refractionValue"),
  density: document.querySelector("#densityValue"),
  rowWeight: document.querySelector("#rowWeightValue"),
  cellGap: document.querySelector("#cellGapValue"),
  fillThreshold: document.querySelector("#fillThresholdValue"),
  ringTwist: document.querySelector("#ringTwistValue"),
  recognition: document.querySelector("#recognitionValue"),
};

const palettes = {
  navy: { background: "#132d4d", foreground: "#ffffff", guide: "rgba(255,255,255,0.22)" },
  ink: { background: "#101010", foreground: "#ffffff", guide: "rgba(255,255,255,0.18)" },
  paper: { background: "#f7f4ed", foreground: "#132d4d", guide: "rgba(19,45,77,0.2)" },
};

let currentPalette = "navy";

function readState() {
  const rawLetter = inputs.letter.value.trim().slice(0, 1).toUpperCase();
  return {
    letter: rawLetter || "Э",
    font: inputs.font.value,
    template: inputs.template.value,
    renderMode: inputs.renderMode.value,
    sectors: Number(inputs.sectors.value),
    scale: Number(inputs.scale.value),
    offset: Number(inputs.offset.value),
    refraction: Number(inputs.refraction.value),
    density: Number(inputs.density.value),
    rowWeight: Number(inputs.rowWeight.value),
    cellGap: Number(inputs.cellGap.value),
    fillThreshold: Number(inputs.fillThreshold.value),
    ringTwist: Number(inputs.ringTwist.value),
    recognition: Number(inputs.recognition.value),
    showGrid: inputs.showGrid.checked,
    palette: currentPalette,
  };
}

function getRingSpec(template, ring, sectors, rowWeight) {
  const base = Math.max(46, rowWeight);
  const specs = {
    brick: {
      count: sectors + ring * 2,
      phase: ring % 2 ? 180 / (sectors + ring * 2) : 0,
      width: base * 0.78,
      spin: ring * 7,
      jitter: 0.16,
    },
    galaxy: {
      count: sectors + ring * 4 + (ring % 2) * 2,
      phase: ring * 16,
      width: base * (0.62 + ring * 0.08),
      spin: ring * 18,
      jitter: 0.46,
    },
    sunburst: {
      count: ring < 2 ? sectors : Math.max(6, Math.floor(sectors / 2)),
      phase: ring * 4,
      width: base * (ring < 2 ? 0.72 : 1.24),
      spin: ring * 3,
      jitter: 0.08,
    },
    mixed: {
      count: ring % 3 === 0 ? sectors : sectors + ring * 3,
      phase: ring % 2 ? 360 / (sectors + ring * 3 || sectors) / 2 : ring * 11,
      width: base * (ring % 3 === 0 ? 1.18 : 0.7),
      spin: ring * 12,
      jitter: 0.32,
    },
    barcode: {
      count: sectors + ring * 6,
      phase: ring * 9,
      width: base * (ring === 0 ? 0.54 : 0.7),
      spin: ring * 5,
      jitter: 0.22,
    },
    pulse: {
      count: sectors * 2 + ring * 4,
      phase: ring * 23,
      width: base * (0.48 + ring * 0.09),
      spin: ring * 17,
      jitter: 0.58,
    },
    burst: {
      count: ring === 0 ? sectors : sectors + ring * 3,
      phase: ring * 19,
      width: base * (ring === 0 ? 1.15 : 0.72),
      spin: ring * 13,
      jitter: 0.4,
    },
    rosette: {
      count: ring === 0 ? sectors : sectors + (ring % 2 === 0 ? 0 : sectors),
      phase: ring % 2 ? 360 / (sectors * 2) : 0,
      width: base * 0.74,
      spin: ring * 0,
      jitter: 0.12,
    },
  };

  return specs[template] || specs.brick;
}

function polar(cx, cy, radius, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function cellPath(context, innerRadius, outerRadius, startDeg, endDeg, gap = 0) {
  const angularGap = gap / Math.max(outerRadius, 1) / (Math.PI / 180);
  const radialGap = gap * 0.5;
  const safeInner = Math.min(Math.max(0, innerRadius + radialGap), outerRadius - 2);
  const safeOuter = Math.max(safeInner + 2, outerRadius - radialGap);
  const safeStart = startDeg + angularGap;
  const safeEnd = endDeg - angularGap;
  if (safeEnd <= safeStart) {
    context.beginPath();
    return;
  }
  const outerStart = polar(CENTER, CENTER, safeOuter, safeStart);
  const outerEnd = polar(CENTER, CENTER, safeOuter, safeEnd);
  const innerEnd = polar(CENTER, CENTER, safeInner, safeEnd);
  const innerStart = polar(CENTER, CENTER, safeInner, safeStart);

  context.beginPath();
  if (safeInner <= 0) {
    context.moveTo(CENTER, CENTER);
    context.lineTo(outerStart.x, outerStart.y);
    context.arc(CENTER, CENTER, safeOuter, angleToRad(safeStart), angleToRad(safeEnd));
    context.closePath();
    return;
  }

  context.moveTo(outerStart.x, outerStart.y);
  context.arc(CENTER, CENTER, safeOuter, angleToRad(safeStart), angleToRad(safeEnd));
  context.lineTo(innerEnd.x, innerEnd.y);
  context.arc(CENTER, CENTER, safeInner, angleToRad(safeEnd), angleToRad(safeStart), true);
  context.closePath();
}

function angleToRad(deg) {
  return ((deg - 90) * Math.PI) / 180;
}

function makeCells(state) {
  const cells = [];
  let innerRadius = 24;

  for (let ring = 0; ring < state.density; ring += 1) {
    const spec = getRingSpec(state.template, ring, state.sectors, state.rowWeight);
    const outerRadius = Math.min(430, innerRadius + spec.width);
    const cellAngle = 360 / spec.count;
    const twistScale = state.template === "rosette" ? 0.35 : 1;
    const ringTurn =
      state.ringTwist *
      twistScale *
      ((ring + 1) / Math.max(1, state.density)) *
      (ring % 2 === 0 ? 1 : -1);

    for (let index = 0; index < spec.count; index += 1) {
      const angle = index * cellAngle + spec.phase + spec.spin + ringTurn;
      const wave = Math.sin((index / spec.count) * Math.PI * 2 + ring * 0.8) * spec.jitter;
      cells.push({
        ring,
        index,
        innerRadius,
        outerRadius,
        start: angle - cellAngle * 0.47,
        end: angle + cellAngle * 0.47,
        angle,
        wave,
        depth: (ring + 1) / state.density,
        centerRadius: (innerRadius + outerRadius) / 2,
      });
    }

    innerRadius = outerRadius;
  }

  return cells;
}

function sampleCellCoverage(cell) {
  const radius = cell.centerRadius;
  const angle = (cell.start + cell.end) / 2;
  const points = [
    [radius, angle],
    [cell.innerRadius * 0.72 + cell.outerRadius * 0.28, angle],
    [cell.innerRadius * 0.28 + cell.outerRadius * 0.72, angle],
    [radius, cell.start * 0.65 + cell.end * 0.35],
    [radius, cell.start * 0.35 + cell.end * 0.65],
  ];
  let alpha = 0;

  points.forEach(([pointRadius, pointAngle]) => {
    const point = polar(CENTER, CENTER, pointRadius, pointAngle);
    const pixel = sourceCtx.getImageData(
      Math.max(0, Math.min(SIZE - 1, Math.round(point.x))),
      Math.max(0, Math.min(SIZE - 1, Math.round(point.y))),
      1,
      1
    ).data;
    alpha += pixel[3] / 255;
  });

  return alpha / points.length;
}

function drawSolidCell(state, cell) {
  const palette = palettes[state.palette];
  const coverage = sampleCellCoverage(cell);
  const threshold = state.fillThreshold / 100;
  if (coverage < threshold) return;

  const strength = Math.min(1, coverage * 1.8);
  const gap = state.template === "burst" ? Math.max(10, state.cellGap) : state.cellGap;

  ctx.save();
  ctx.globalAlpha = 0.72 + strength * 0.28;
  ctx.fillStyle = palette.foreground;
  cellPath(ctx, cell.innerRadius, cell.outerRadius, cell.start, cell.end, gap);
  ctx.fill();
  ctx.restore();
}

function drawSourceLetter(state) {
  const palette = palettes[state.palette];
  sourceCtx.clearRect(0, 0, SIZE, SIZE);
  sourceCtx.fillStyle = palette.foreground;
  sourceCtx.textAlign = "center";
  sourceCtx.textBaseline = "middle";
  sourceCtx.font = `900 ${state.scale * 8}px ${state.font}`;
  sourceCtx.fillText(state.letter, CENTER, CENTER + state.offset * 0.12);
}

function drawBurstCore(state) {
  const palette = palettes[state.palette];
  const coreRadius = 110 + state.rowWeight * 0.9;
  const biteRadius = 58 + (100 - state.recognition) * 0.35;
  const cutAngle = angleToRad(-12 + state.ringTwist * 0.18);
  const cutX = CENTER + Math.cos(cutAngle) * coreRadius * 0.45;
  const cutY = CENTER + Math.sin(cutAngle) * coreRadius * 0.45;

  ctx.save();
  ctx.fillStyle = palette.foreground;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cutX, cutY, biteRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFragment(state, cell) {
  const mix = state.recognition / 100;
  const isBurst = state.template === "burst";
  const displacement = state.refraction * (0.55 + cell.depth * 0.65);
  const ringRotation = state.ringTwist * cell.depth * (cell.ring % 2 === 0 ? 1 : -1);
  const rotation = isBurst
    ? ringRotation * 0.45 + cell.wave * 18
    : ringRotation + ((1 - mix) * 28 + 4) * cell.wave;
  const zoom = isBurst ? 1 + cell.depth * 0.42 : 1 + (1 - mix) * 0.25 * cell.depth;
  const radialPush = isBurst ? state.refraction * cell.depth * 1.8 : 0;
  const dx =
    displacement * Math.cos(angleToRad(cell.angle)) +
    radialPush * Math.cos(angleToRad(cell.angle)) +
    state.offset * 0.08 * cell.wave;
  const dy =
    displacement * Math.sin(angleToRad(cell.angle)) +
    radialPush * Math.sin(angleToRad(cell.angle)) +
    state.offset * 0.05 * cell.depth;

  const gap = state.template === "burst" ? Math.max(10, state.cellGap) : state.cellGap;

  ctx.save();
  cellPath(ctx, cell.innerRadius, cell.outerRadius, cell.start, cell.end, gap);
  ctx.clip();
  ctx.translate(CENTER, CENTER);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(zoom, zoom);
  ctx.drawImage(sourceCanvas, -CENTER + dx, -CENTER + dy, SIZE, SIZE);
  ctx.restore();
}

function drawGrid(state, cells) {
  const palette = palettes[state.palette];
  ctx.save();
  ctx.strokeStyle = palette.guide;
  ctx.lineWidth = 1.35;
  ctx.globalAlpha = state.template === "galaxy" ? 0.95 : 0.78;
  cells.forEach((cell) => {
    cellPath(ctx, cell.innerRadius, cell.outerRadius, cell.start, cell.end, state.cellGap);
    ctx.stroke();
  });
  ctx.restore();
}

function drawOuterMask(palette) {
  ctx.save();
  ctx.strokeStyle = palette.guide;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 430, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function render() {
  const state = readState();
  Object.keys(outputs).forEach((key) => {
    outputs[key].value = state[key];
  });

  const palette = palettes[state.palette];
  const cells = makeCells(state);
  drawSourceLetter(state);

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, SIZE, SIZE);

  if (state.template === "burst" && state.renderMode === "raster") {
    drawBurstCore(state);
  }

  if (state.renderMode === "solid") {
    cells.forEach((cell) => drawSolidCell(state, cell));
  } else {
    cells.forEach((cell) => drawFragment(state, cell));
  }
  drawOuterMask(palette);
  if (state.showGrid) {
    drawGrid(state, cells);
  }
}

function download(filename, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadPng() {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `enko-prism-${readState().letter}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function randomize() {
  const templates = ["brick", "galaxy", "sunburst", "mixed", "barcode", "pulse", "burst", "rosette"];
  inputs.template.value = templates[Math.floor(Math.random() * templates.length)];
  inputs.renderMode.value = Math.random() > 0.35 ? "solid" : "raster";
  inputs.sectors.value = String([4, 6, 8, 10, 12, 16][Math.floor(Math.random() * 6)]);
  inputs.scale.value = String(42 + Math.floor(Math.random() * 42));
  inputs.offset.value = String(-60 + Math.floor(Math.random() * 240));
  inputs.refraction.value = String(-60 + Math.floor(Math.random() * 120));
  inputs.density.value = String(2 + Math.floor(Math.random() * 4));
  inputs.rowWeight.value = String(62 + Math.floor(Math.random() * 62));
  inputs.cellGap.value = String(Math.floor(Math.random() * 22));
  inputs.fillThreshold.value = String(8 + Math.floor(Math.random() * 28));
  inputs.ringTwist.value = String(-70 + Math.floor(Math.random() * 140));
  inputs.recognition.value = String(38 + Math.floor(Math.random() * 48));
  render();
}

Object.values(inputs).forEach((input) => input.addEventListener("input", render));

document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    currentPalette = button.dataset.palette;
    document.querySelectorAll(".swatch").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    render();
  });
});

document.querySelector("#randomButton").addEventListener("click", randomize);
document.querySelector("#downloadPngButton").addEventListener("click", downloadPng);
document.querySelector("#downloadJsonButton").addEventListener("click", () => {
  download(
    `enko-prism-${readState().letter}.json`,
    "application/json",
    JSON.stringify(readState(), null, 2)
  );
});

render();
