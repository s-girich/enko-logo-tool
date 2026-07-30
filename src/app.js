const svg = document.querySelector("#logoSvg");
const sourceCanvas = document.createElement("canvas");
const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

const SVG_NS = "http://www.w3.org/2000/svg";
const SIZE = 1000;
const CENTER = SIZE / 2;
const cellCountOutput = document.querySelector("#cellCountValue");
const sectorsLabel = document.querySelector("#sectorsLabel");
const ringTwistLabel = document.querySelector("#ringTwistLabel");
const metricLabel = document.querySelector("#metricLabel");
const densityLabel = document.querySelector("#densityLabel");
const rowWeightLabel = document.querySelector("#rowWeightLabel");
const symmetryField = document.querySelector("#symmetryField");
const densityField = document.querySelector("#densityField");
const rowWeightField = document.querySelector("#rowWeightField");

sourceCanvas.width = SIZE;
sourceCanvas.height = SIZE;

const inputs = {
  letter: document.querySelector("#letterInput"),
  font: document.querySelector("#fontSelect"),
  template: document.querySelector("#templateSelect"),
  symmetry: document.querySelector("#symmetrySelect"),
  sectors: document.querySelector("#sectorsInput"),
  scale: document.querySelector("#scaleInput"),
  offset: document.querySelector("#offsetInput"),
  density: document.querySelector("#densityInput"),
  rowWeight: document.querySelector("#rowWeightInput"),
  cellGap: document.querySelector("#cellGapInput"),
  fillThreshold: document.querySelector("#fillThresholdInput"),
  ringTwist: document.querySelector("#ringTwistInput"),
  showGrid: document.querySelector("#gridToggle"),
};

const palettes = {
  navy: {
    background: "#132d4d",
    foreground: "#ffffff",
    guide: "#52657d",
    accents: ["#ffffff", "#58c4d8", "#42d6a4", "#ff5d73", "#ffc857"],
  },
  ink: {
    background: "#101010",
    foreground: "#ffffff",
    guide: "#4b4b4b",
    accents: ["#ffffff", "#1688c7", "#45d6a8", "#ff2450", "#ffbf47"],
  },
  paper: {
    background: "#f7f4ed",
    foreground: "#132d4d",
    guide: "#c6c7c5",
    accents: ["#132d4d", "#1688c7", "#21b98b", "#f43f5e", "#f5a623"],
  },
};

let currentPalette = "navy";

function isKaleidoscopeTemplate(template) {
  return ["square-kaleidoscope", "radial-emblem", "modular-crest"].includes(template);
}

function readNumber(input, fallback, options = {}) {
  const parsed = "valueAsNumber" in input ? input.valueAsNumber : Number(input.value);
  if (!Number.isFinite(parsed)) return fallback;
  return options.integer ? Math.round(parsed) : parsed;
}

function readState() {
  const rawLetter = inputs.letter.value.trim().slice(0, 1).toUpperCase();
  return {
    letter: rawLetter || "Э",
    font: inputs.font.value,
    template: inputs.template.value,
    symmetry: readNumber(inputs.symmetry, 8, { integer: true }),
    sectors: readNumber(inputs.sectors, 10, { integer: true }),
    scale: readNumber(inputs.scale, 62),
    offset: readNumber(inputs.offset, 104),
    density: readNumber(inputs.density, 3, { integer: true }),
    rowWeight: readNumber(inputs.rowWeight, 86),
    cellGap: readNumber(inputs.cellGap, 12),
    fillThreshold: readNumber(inputs.fillThreshold, 14),
    ringTwist: readNumber(inputs.ringTwist, 12),
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
      spin: 0,
      jitter: 0.12,
    },
  };

  return specs[template] || specs.rosette;
}

function angleToRad(deg) {
  return ((deg - 90) * Math.PI) / 180;
}

function polar(radius, deg) {
  const rad = angleToRad(deg);
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function formatNumber(value) {
  return Number(value.toFixed(2));
}

function getCellGeometry(cell, gap = 0) {
  const angularGap = gap / Math.max(cell.outerRadius, 1) / (Math.PI / 180);
  const radialGap = gap * 0.5;
  const innerRadius = Math.min(Math.max(0, cell.innerRadius + radialGap), cell.outerRadius - 2);
  const outerRadius = Math.max(innerRadius + 2, cell.outerRadius - radialGap);
  const start = cell.start + angularGap;
  const end = cell.end - angularGap;

  if (end <= start) return null;
  return { innerRadius, outerRadius, start, end };
}

function cellPathData(cell, gap = 0) {
  const geometry = getCellGeometry(cell, gap);
  if (!geometry) return "";

  const { innerRadius, outerRadius, start, end } = geometry;
  const outerStart = polar(outerRadius, start);
  const outerEnd = polar(outerRadius, end);
  const largeArc = end - start > 180 ? 1 : 0;

  if (innerRadius <= 0) {
    return [
      `M ${CENTER} ${CENTER}`,
      `L ${formatNumber(outerStart.x)} ${formatNumber(outerStart.y)}`,
      `A ${formatNumber(outerRadius)} ${formatNumber(outerRadius)} 0 ${largeArc} 1 ${formatNumber(outerEnd.x)} ${formatNumber(outerEnd.y)}`,
      "Z",
    ].join(" ");
  }

  const innerEnd = polar(innerRadius, end);
  const innerStart = polar(innerRadius, start);
  return [
    `M ${formatNumber(outerStart.x)} ${formatNumber(outerStart.y)}`,
    `A ${formatNumber(outerRadius)} ${formatNumber(outerRadius)} 0 ${largeArc} 1 ${formatNumber(outerEnd.x)} ${formatNumber(outerEnd.y)}`,
    `L ${formatNumber(innerEnd.x)} ${formatNumber(innerEnd.y)}`,
    `A ${formatNumber(innerRadius)} ${formatNumber(innerRadius)} 0 ${largeArc} 0 ${formatNumber(innerStart.x)} ${formatNumber(innerStart.y)}`,
    "Z",
  ].join(" ");
}

function makeCells(state) {
  const cells = [];
  const ringCount = Math.max(0, state.density);
  const ringSpecs = Array.from({ length: ringCount }, (_, ring) =>
    getRingSpec(state.template, ring, state.sectors, state.rowWeight)
  );
  const availableRadius = 430 - 24;
  const desiredRadius = ringSpecs.reduce((sum, spec) => sum + spec.width, 0);
  const widthScale = desiredRadius > availableRadius ? availableRadius / desiredRadius : 1;
  let innerRadius = 24;

  for (let ring = 0; ring < ringCount; ring += 1) {
    const spec = ringSpecs[ring];
    const normalizedOuterRadius = Math.min(430, innerRadius + spec.width * widthScale);
    const cellAngle = 360 / spec.count;
    const twistScale = state.template === "rosette" ? 0.35 : 1;
    const ringTurn =
      state.ringTwist *
      twistScale *
      ((ring + 1) / Math.max(1, state.density)) *
      (ring % 2 === 0 ? 1 : -1);

    for (let index = 0; index < spec.count; index += 1) {
      const angle = index * cellAngle + spec.phase + spec.spin + ringTurn;
      cells.push({
        ring,
        index,
        innerRadius,
        outerRadius: normalizedOuterRadius,
        start: angle - cellAngle * 0.47,
        end: angle + cellAngle * 0.47,
      });
    }

    innerRadius = normalizedOuterRadius;
  }

  return cells;
}

function drawSourceLetter(state) {
  sourceCtx.clearRect(0, 0, SIZE, SIZE);
  sourceCtx.save();
  sourceCtx.fillStyle = "#000000";
  sourceCtx.textAlign = "center";
  sourceCtx.textBaseline = "middle";
  sourceCtx.font = `900 ${state.scale * 8}px ${state.font}`;
  sourceCtx.translate(CENTER, CENTER);
  if (isKaleidoscopeTemplate(state.template)) {
    sourceCtx.rotate((state.ringTwist * Math.PI) / 180);
  }
  sourceCtx.fillText(state.letter, 0, state.offset * 0.12);
  sourceCtx.restore();
  return sourceCtx.getImageData(0, 0, SIZE, SIZE).data;
}

function sampleCellCoverage(cell, gap, pixels) {
  const geometry = getCellGeometry(cell, gap);
  if (!geometry) return 0;

  const { innerRadius, outerRadius, start, end } = geometry;
  const radialSamples = 5;
  const angularSamples = 9;
  let alpha = 0;

  for (let radialIndex = 0; radialIndex < radialSamples; radialIndex += 1) {
    const radialRatio = (radialIndex + 0.5) / radialSamples;
    const radius = innerRadius + (outerRadius - innerRadius) * radialRatio;

    for (let angularIndex = 0; angularIndex < angularSamples; angularIndex += 1) {
      const angularRatio = (angularIndex + 0.5) / angularSamples;
      const angle = start + (end - start) * angularRatio;
      const point = polar(radius, angle);
      const x = Math.max(0, Math.min(SIZE - 1, Math.round(point.x)));
      const y = Math.max(0, Math.min(SIZE - 1, Math.round(point.y)));
      alpha += pixels[(y * SIZE + x) * 4 + 3] / 255;
    }
  }

  return alpha / (radialSamples * angularSamples);
}

function sampleRectCoverage(rect, pixels) {
  const samples = 5;
  let alpha = 0;

  for (let row = 0; row < samples; row += 1) {
    for (let column = 0; column < samples; column += 1) {
      const x = Math.max(
        0,
        Math.min(SIZE - 1, Math.round(rect.x + ((column + 0.5) / samples) * rect.size))
      );
      const y = Math.max(
        0,
        Math.min(SIZE - 1, Math.round(rect.y + ((row + 0.5) / samples) * rect.size))
      );
      alpha += pixels[(y * SIZE + x) * 4 + 3] / 255;
    }
  }

  return alpha / (samples * samples);
}

function makeSquareModules(state, pixels) {
  const count = Math.max(2, Math.abs(state.sectors));
  const extent = 700;
  const start = (SIZE - extent) / 2;
  const cellSize = extent / count;
  const threshold = state.fillThreshold / 100;
  const modules = [];

  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      let seedRow = Math.floor(Math.abs(row - (count - 1) / 2));
      let seedColumn = Math.floor(Math.abs(column - (count - 1) / 2));

      if (state.symmetry === 8 && seedRow > seedColumn) {
        [seedRow, seedColumn] = [seedColumn, seedRow];
      }

      const seedRect = {
        x: CENTER + seedColumn * cellSize,
        y: CENTER + seedRow * cellSize,
        size: cellSize,
      };
      const coverage = sampleRectCoverage(seedRect, pixels);
      if (coverage < threshold) continue;

      const grammarKey =
        Math.abs((seedRow + 1) * 7 + (seedColumn + 1) * 11 + Math.round(coverage * 100)) % 4;
      const shape = ["rect", "circle", "diamond", "quarter"][grammarKey];
      const horizontal = column < count / 2 ? "right" : "left";
      const vertical = row < count / 2 ? "bottom" : "top";

      modules.push({
        row,
        column,
        seedRow,
        seedColumn,
        coverage,
        shape,
        corner: `${vertical}-${horizontal}`,
        x: start + column * cellSize,
        y: start + row * cellSize,
        size: cellSize,
      });
    }
  }

  return { count, extent, start, modules, total: count * count };
}

function getSquareGeometry(module, gap) {
  const inset = gap * 0.5;
  const size = module.size - gap;
  if (size <= 1) return null;
  return {
    x: module.x + inset,
    y: module.y + inset,
    size,
  };
}

function diamondPathData({ x, y, size }) {
  const half = size / 2;
  return [
    `M ${formatNumber(x + half)} ${formatNumber(y)}`,
    `L ${formatNumber(x + size)} ${formatNumber(y + half)}`,
    `L ${formatNumber(x + half)} ${formatNumber(y + size)}`,
    `L ${formatNumber(x)} ${formatNumber(y + half)}`,
    "Z",
  ].join(" ");
}

function quarterPathData(geometry, corner) {
  const { x, y, size } = geometry;
  const points = {
    "bottom-right": {
      center: [x + size, y + size],
      start: [x, y + size],
      end: [x + size, y],
    },
    "bottom-left": {
      center: [x, y + size],
      start: [x, y],
      end: [x + size, y + size],
    },
    "top-left": {
      center: [x, y],
      start: [x + size, y],
      end: [x, y + size],
    },
    "top-right": {
      center: [x + size, y],
      start: [x + size, y + size],
      end: [x, y],
    },
  };
  const point = points[corner];
  return [
    `M ${formatNumber(point.center[0])} ${formatNumber(point.center[1])}`,
    `L ${formatNumber(point.start[0])} ${formatNumber(point.start[1])}`,
    `A ${formatNumber(size)} ${formatNumber(size)} 0 0 1 ${formatNumber(point.end[0])} ${formatNumber(point.end[1])}`,
    "Z",
  ].join(" ");
}

function getModuleFill(module, palette, offset = 0) {
  const coverageBand = Math.round(module.coverage * 4);
  const shapeCode = module.shape ? module.shape.charCodeAt(0) : 0;
  const colorKey =
    (module.seedRow * 7 +
      module.seedColumn * 11 +
      coverageBand * 3 +
      shapeCode +
      offset) %
    palette.accents.length;
  return palette.accents[colorKey];
}

function sampleDiscCoverage(centerX, centerY, radius, pixels) {
  const samples = 7;
  let alpha = 0;
  let sampledPoints = 0;

  for (let row = 0; row < samples; row += 1) {
    for (let column = 0; column < samples; column += 1) {
      const localX = ((column + 0.5) / samples) * 2 - 1;
      const localY = ((row + 0.5) / samples) * 2 - 1;
      if (localX * localX + localY * localY > 1) continue;

      const x = Math.max(0, Math.min(SIZE - 1, Math.round(centerX + localX * radius)));
      const y = Math.max(0, Math.min(SIZE - 1, Math.round(centerY + localY * radius)));
      alpha += pixels[(y * SIZE + x) * 4 + 3] / 255;
      sampledPoints += 1;
    }
  }

  return sampledPoints ? alpha / sampledPoints : 0;
}

function makeRadialEmblem(state, pixels) {
  const petals = Math.max(3, Math.abs(state.sectors));
  const layers = Math.max(1, Math.abs(state.density));
  const innerRadius = 82;
  const radialExtent = 300;
  const layerStep = radialExtent / layers;
  const moduleSize = layerStep * 0.68 * (state.rowWeight / 86) - state.cellGap;
  const threshold = state.fillThreshold / 100;
  const modules = [];
  const shapeGrammar = ["circle", "diamond", "petal", "bar"];

  for (let layer = 0; layer < layers; layer += 1) {
    const radius = innerRadius + (layer + 0.62) * layerStep;
    const seedRadius = 50 + (layer + 0.55) * (220 / layers);

    for (let track = 0; track < 2; track += 1) {
      const seedAngle = 20 + track * 34;
      const seedPoints = [polar(seedRadius, seedAngle), polar(seedRadius, seedAngle + 90)];
      const coverage = Math.max(
        ...seedPoints.map((seedPoint) =>
          sampleDiscCoverage(
            seedPoint.x,
            seedPoint.y,
            Math.max(4, Math.abs(moduleSize) * 0.48),
            pixels
          )
        )
      );
      if (coverage < threshold) continue;

      const grammarKey =
        Math.abs(layer * 5 + track * 3 + Math.round(coverage * 100)) % shapeGrammar.length;
      const shape = shapeGrammar[grammarKey];

      for (let petal = 0; petal < petals; petal += 1) {
        const wedge = 360 / petals;
        const angle = petal * wedge + (track === 0 ? -wedge * 0.2 : wedge * 0.2);
        const point = polar(radius, angle);
        modules.push({
          layer,
          petal,
          track,
          seedRow: layer,
          seedColumn: track,
          coverage,
          shape,
          angle,
          x: point.x,
          y: point.y,
          size: moduleSize,
        });
      }
    }
  }

  const coreCoverage = sampleDiscCoverage(CENTER, CENTER, 54, pixels);
  const core =
    coreCoverage >= threshold
      ? {
          seedRow: 0,
          seedColumn: 0,
          coverage: coreCoverage,
          shape: coreCoverage > 0.6 ? "circle" : "diamond",
          x: CENTER,
          y: CENTER,
          size: Math.max(44, Math.abs(moduleSize) * 0.9),
        }
      : null;

  return {
    petals,
    layers,
    modules,
    core,
    total: petals * layers * 2 + 1,
  };
}

function appendRadialModule(group, module, palette) {
  if (module.size <= 1) return;
  const shapeIndex = ["circle", "diamond", "petal", "bar"].indexOf(module.shape);
  const fill =
    palette.accents[
      ((module.layer || 0) * 2 + (module.track || 0) + Math.max(0, shapeIndex)) %
        palette.accents.length
    ];
  const half = module.size / 2;
  let shape;

  if (module.shape === "petal") {
    shape = createSvgElement("ellipse", {
      cx: formatNumber(module.x),
      cy: formatNumber(module.y),
      rx: formatNumber(module.size * 0.38),
      ry: formatNumber(module.size * 0.62),
      fill,
      transform: `rotate(${formatNumber(module.angle)} ${formatNumber(module.x)} ${formatNumber(module.y)})`,
    });
  } else if (module.shape === "bar") {
    shape = createSvgElement("rect", {
      x: formatNumber(module.x - module.size * 0.28),
      y: formatNumber(module.y - module.size * 0.62),
      width: formatNumber(module.size * 0.56),
      height: formatNumber(module.size * 1.24),
      fill,
      transform: `rotate(${formatNumber(module.angle)} ${formatNumber(module.x)} ${formatNumber(module.y)})`,
    });
  } else if (module.shape === "diamond") {
    shape = createSvgElement("path", {
      d: diamondPathData({
        x: module.x - half,
        y: module.y - half,
        size: module.size,
      }),
      fill,
    });
  } else {
    shape = createSvgElement("circle", {
      cx: formatNumber(module.x),
      cy: formatNumber(module.y),
      r: formatNumber(half),
      fill,
    });
  }

  shape.setAttribute("data-shape", module.shape);
  shape.setAttribute("data-layer-index", module.layer || 0);
  shape.setAttribute("data-petal", module.petal ?? -1);
  shape.setAttribute("data-track", module.track ?? -1);
  group.append(shape);
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function updateControlContext(state) {
  const isSquare = state.template === "square-kaleidoscope";
  const isCrest = state.template === "modular-crest";
  const isEmblem = state.template === "radial-emblem";
  const isSquareFamily = isSquare || isCrest;
  symmetryField.classList.toggle("is-hidden", !isSquareFamily);
  densityField.classList.toggle("is-hidden", isSquareFamily);
  rowWeightField.classList.toggle("is-hidden", isSquareFamily);
  sectorsLabel.textContent = isSquareFamily
    ? "Модули по стороне"
    : isEmblem
      ? "Лепестки"
      : "Секторы";
  densityLabel.textContent = isEmblem ? "Слои" : "Ряды";
  rowWeightLabel.textContent = isEmblem ? "Размер модулей" : "Толщина рядов";
  ringTwistLabel.textContent = isKaleidoscopeTemplate(state.template)
    ? "Поворот семени"
    : "Вращение рядов";
  metricLabel.textContent = isKaleidoscopeTemplate(state.template)
    ? "Модули: сетка / заполнено"
    : "Ячейки: всего / после промежутков";
}

function appendSquareModule(group, module, geometry, palette) {
  const fill = getModuleFill(module, palette);
  let shape;

  if (module.shape === "circle") {
    shape = createSvgElement("circle", {
      cx: formatNumber(geometry.x + geometry.size / 2),
      cy: formatNumber(geometry.y + geometry.size / 2),
      r: formatNumber(geometry.size / 2),
      fill,
    });
  } else if (module.shape === "diamond") {
    shape = createSvgElement("path", {
      d: diamondPathData(geometry),
      fill,
    });
  } else if (module.shape === "quarter") {
    shape = createSvgElement("path", {
      d: quarterPathData(geometry, module.corner),
      fill,
    });
  } else {
    shape = createSvgElement("rect", {
      x: formatNumber(geometry.x),
      y: formatNumber(geometry.y),
      width: formatNumber(geometry.size),
      height: formatNumber(geometry.size),
      fill,
    });
  }

  shape.setAttribute("data-shape", module.shape);
  shape.setAttribute("data-grid-row", module.row);
  shape.setAttribute("data-grid-column", module.column);
  shape.setAttribute("data-seed", `${module.seedRow}:${module.seedColumn}`);
  group.append(shape);
}

function renderSquareKaleidoscope(state, palette, pixels) {
  const square = makeSquareModules(state, pixels);
  const renderableModules = square.modules.filter((module) =>
    getSquareGeometry(module, state.cellGap)
  );
  cellCountOutput.value = `${square.total} / ${renderableModules.length}`;
  const mark = createSvgElement("g", {
    "data-layer": "mark",
  });

  renderableModules.forEach((module) => {
    const geometry = getSquareGeometry(module, state.cellGap);
    appendSquareModule(mark, module, geometry, palette);
  });
  svg.append(mark);

  if (state.showGrid) {
    const grid = createSvgElement("g", {
      fill: "none",
      stroke: palette.guide,
      "stroke-width": 1.35,
      "data-layer": "grid",
    });
    const cellSize = square.extent / square.count;
    for (let row = 0; row < square.count; row += 1) {
      for (let column = 0; column < square.count; column += 1) {
        grid.append(
          createSvgElement("rect", {
            x: formatNumber(square.start + column * cellSize),
            y: formatNumber(square.start + row * cellSize),
            width: formatNumber(cellSize),
            height: formatNumber(cellSize),
          })
        );
      }
    }
    svg.append(grid);

    svg.append(
      createSvgElement("rect", {
        x: square.start,
        y: square.start,
        width: square.extent,
        height: square.extent,
        fill: "none",
        stroke: palette.guide,
        "stroke-width": 2,
        "data-layer": "boundary",
      })
    );
  }
}

function appendCrestModule(group, module, geometry, palette, count) {
  const centerIndex = (count - 1) / 2;
  const dx = Math.abs(module.column - centerIndex);
  const dy = Math.abs(module.row - centerIndex);
  const fill = getModuleFill(module, palette, Math.round(dx + dy));
  let crestShape;

  if (dx > dy + 0.45) {
    crestShape = "horizontal-bar";
  } else if (dy > dx + 0.45) {
    crestShape = "vertical-bar";
  } else if (dx < 1.2 && dy < 1.2) {
    crestShape = "diamond";
  } else {
    crestShape = module.shape === "quarter" ? "corner" : "circle";
  }

  let shape;
  if (crestShape === "horizontal-bar") {
    shape = createSvgElement("rect", {
      x: formatNumber(geometry.x - geometry.size * 0.22),
      y: formatNumber(geometry.y + geometry.size * 0.24),
      width: formatNumber(geometry.size * 1.44),
      height: formatNumber(geometry.size * 0.52),
      fill,
    });
  } else if (crestShape === "vertical-bar") {
    shape = createSvgElement("rect", {
      x: formatNumber(geometry.x + geometry.size * 0.24),
      y: formatNumber(geometry.y - geometry.size * 0.22),
      width: formatNumber(geometry.size * 0.52),
      height: formatNumber(geometry.size * 1.44),
      fill,
    });
  } else if (crestShape === "diamond") {
    shape = createSvgElement("path", {
      d: diamondPathData(geometry),
      fill,
    });
  } else if (crestShape === "corner") {
    shape = createSvgElement("path", {
      d: quarterPathData(geometry, module.corner),
      fill,
    });
  } else {
    shape = createSvgElement("circle", {
      cx: formatNumber(geometry.x + geometry.size / 2),
      cy: formatNumber(geometry.y + geometry.size / 2),
      r: formatNumber(geometry.size / 2),
      fill,
    });
  }

  shape.setAttribute("data-shape", crestShape);
  shape.setAttribute("data-grid-row", module.row);
  shape.setAttribute("data-grid-column", module.column);
  group.append(shape);
}

function renderModularCrest(state, palette, pixels) {
  const square = makeSquareModules(state, pixels);
  const renderableModules = square.modules.filter((module) =>
    getSquareGeometry(module, state.cellGap * 0.65)
  );
  cellCountOutput.value = `${square.total} / ${renderableModules.length}`;
  const mark = createSvgElement("g", {
    "data-layer": "mark",
  });

  renderableModules.forEach((module) => {
    const geometry = getSquareGeometry(module, state.cellGap * 0.65);
    appendCrestModule(mark, module, geometry, palette, square.count);
  });
  svg.append(mark);

  if (state.showGrid) {
    const grid = createSvgElement("g", {
      fill: "none",
      stroke: palette.guide,
      "stroke-width": 1.35,
      "data-layer": "grid",
    });
    const cellSize = square.extent / square.count;
    for (let row = 0; row < square.count; row += 1) {
      for (let column = 0; column < square.count; column += 1) {
        grid.append(
          createSvgElement("rect", {
            x: formatNumber(square.start + column * cellSize),
            y: formatNumber(square.start + row * cellSize),
            width: formatNumber(cellSize),
            height: formatNumber(cellSize),
          })
        );
      }
    }
    svg.append(grid);
    svg.append(
      createSvgElement("rect", {
        x: square.start,
        y: square.start,
        width: square.extent,
        height: square.extent,
        rx: 24,
        fill: "none",
        stroke: palette.guide,
        "stroke-width": 2,
        "data-layer": "boundary",
      })
    );
  }
}

function renderRadialEmblem(state, palette, pixels) {
  const emblem = makeRadialEmblem(state, pixels);
  const visibleModules = emblem.modules.filter((module) => module.size > 1);
  const visibleCount = visibleModules.length + (emblem.core ? 1 : 0);
  cellCountOutput.value = `${emblem.total} / ${visibleCount}`;
  const mark = createSvgElement("g", {
    "data-layer": "mark",
  });

  if (emblem.core) {
    appendRadialModule(mark, emblem.core, palette);
  }
  visibleModules.forEach((module) => appendRadialModule(mark, module, palette));
  svg.append(mark);

  if (state.showGrid) {
    const grid = createSvgElement("g", {
      fill: "none",
      stroke: palette.guide,
      "stroke-width": 1.35,
      "data-layer": "grid",
    });
    const innerRadius = 82;
    const radialExtent = 300;
    const layerStep = radialExtent / emblem.layers;
    for (let layer = 0; layer < emblem.layers; layer += 1) {
      grid.append(
        createSvgElement("circle", {
          cx: CENTER,
          cy: CENTER,
          r: formatNumber(innerRadius + (layer + 0.62) * layerStep),
        })
      );
    }
    for (let petal = 0; petal < emblem.petals; petal += 1) {
      const point = polar(382, petal * (360 / emblem.petals));
      grid.append(
        createSvgElement("path", {
          d: `M ${CENTER} ${CENTER} L ${formatNumber(point.x)} ${formatNumber(point.y)}`,
        })
      );
    }
    svg.append(grid);
    svg.append(
      createSvgElement("circle", {
        cx: CENTER,
        cy: CENTER,
        r: 382,
        fill: "none",
        stroke: palette.guide,
        "stroke-width": 2,
        "data-layer": "boundary",
      })
    );
  }
}

function renderRadial(state, palette, pixels) {
  const cells = makeCells(state);
  const visibleCellCount = cells.filter((cell) => cellPathData(cell, state.cellGap)).length;
  cellCountOutput.value = `${cells.length} / ${visibleCellCount}`;
  const gap = state.template === "burst" ? Math.max(10, state.cellGap) : state.cellGap;
  const threshold = state.fillThreshold / 100;
  const mark = createSvgElement("g", {
    fill: palette.foreground,
    "data-layer": "mark",
  });

  cells.forEach((cell) => {
    if (sampleCellCoverage(cell, gap, pixels) < threshold) return;
    const d = cellPathData(cell, gap);
    if (d) mark.append(createSvgElement("path", { d }));
  });
  svg.append(mark);

  if (state.showGrid) {
    const grid = createSvgElement("g", {
      fill: "none",
      stroke: palette.guide,
      "stroke-width": 1.35,
      "data-layer": "grid",
    });
    cells.forEach((cell) => {
      const d = cellPathData(cell, state.cellGap);
      if (d) grid.append(createSvgElement("path", { d }));
    });
    svg.append(grid);

    svg.append(
      createSvgElement("circle", {
        cx: CENTER,
        cy: CENTER,
        r: 430,
        fill: "none",
        stroke: palette.guide,
        "stroke-width": 2,
        "data-layer": "boundary",
      })
    );
  }
}

function render() {
  const state = readState();
  const palette = palettes[state.palette];
  updateControlContext(state);
  const pixels = drawSourceLetter(state);

  svg.setAttribute("data-template", state.template);
  svg.setAttribute(
    "data-symmetry",
    state.template === "radial-emblem"
      ? `radial-${state.sectors}`
      : ["square-kaleidoscope", "modular-crest"].includes(state.template)
        ? state.symmetry
        : 0
  );
  svg.replaceChildren();
  svg.append(
    createSvgElement("rect", {
      width: SIZE,
      height: SIZE,
      fill: palette.background,
    })
  );

  if (state.template === "square-kaleidoscope") {
    renderSquareKaleidoscope(state, palette, pixels);
  } else if (state.template === "radial-emblem") {
    renderRadialEmblem(state, palette, pixels);
  } else if (state.template === "modular-crest") {
    renderModularCrest(state, palette, pixels);
  } else {
    renderRadial(state, palette, pixels);
  }
}

function download(filename, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serializeSvg() {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", SIZE);
  clone.setAttribute("height", SIZE);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

function downloadSvg() {
  download(`enko-prism-${readState().letter}.svg`, "image/svg+xml;charset=utf-8", serializeSvg());
}

function downloadPng() {
  const image = new Image();
  const blob = new Blob([serializeSvg()], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  image.onload = () => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = SIZE * 2;
    exportCanvas.height = SIZE * 2;
    const exportCtx = exportCanvas.getContext("2d");
    exportCtx.drawImage(image, 0, 0, exportCanvas.width, exportCanvas.height);
    exportCanvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const pngUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `enko-prism-${readState().letter}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    }, "image/png");
    URL.revokeObjectURL(url);
  };

  image.src = url;
}

function randomize() {
  const templates = [
    "square-kaleidoscope",
    "radial-emblem",
    "modular-crest",
    "brick",
    "galaxy",
    "sunburst",
    "mixed",
    "barcode",
    "pulse",
    "burst",
    "rosette",
  ];
  inputs.template.value =
    Math.random() < 0.55
      ? ["square-kaleidoscope", "radial-emblem", "modular-crest"][
          Math.floor(Math.random() * 3)
        ]
      : templates[Math.floor(Math.random() * templates.length)];
  inputs.symmetry.value = Math.random() < 0.5 ? "4" : "8";
  inputs.sectors.value = String([4, 6, 8, 10, 12][Math.floor(Math.random() * 5)]);
  inputs.scale.value = String(46 + Math.floor(Math.random() * 36));
  inputs.offset.value = String(-50 + Math.floor(Math.random() * 160));
  inputs.density.value = String(2 + Math.floor(Math.random() * 4));
  inputs.rowWeight.value = String(66 + Math.floor(Math.random() * 54));
  inputs.cellGap.value = String(6 + Math.floor(Math.random() * 15));
  inputs.fillThreshold.value = String(10 + Math.floor(Math.random() * 16));
  inputs.ringTwist.value = String(-55 + Math.floor(Math.random() * 110));
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
document.querySelector("#downloadSvgButton").addEventListener("click", downloadSvg);
document.querySelector("#downloadPngButton").addEventListener("click", downloadPng);
document.querySelector("#downloadJsonButton").addEventListener("click", () => {
  const state = readState();
  let cellCount;
  let visibleCellCount;

  if (["square-kaleidoscope", "modular-crest"].includes(state.template)) {
    const square = makeSquareModules(state, drawSourceLetter(state));
    cellCount = square.total;
    const gapScale = state.template === "modular-crest" ? 0.65 : 1;
    visibleCellCount = square.modules.filter((module) =>
      getSquareGeometry(module, state.cellGap * gapScale)
    ).length;
  } else if (state.template === "radial-emblem") {
    const emblem = makeRadialEmblem(state, drawSourceLetter(state));
    cellCount = emblem.total;
    visibleCellCount =
      emblem.modules.filter((module) => module.size > 1).length + (emblem.core ? 1 : 0);
  } else {
    const cells = makeCells(state);
    cellCount = cells.length;
    visibleCellCount = cells.filter((cell) => cellPathData(cell, state.cellGap)).length;
  }

  download(
    `enko-prism-${state.letter}.json`,
    "application/json",
    JSON.stringify({ ...state, cellCount, visibleCellCount }, null, 2)
  );
});

render();
