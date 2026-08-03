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
  monochrome: document.querySelector("#monochromeToggle"),
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
  return [
    "square-kaleidoscope",
    "radial-emblem",
    "modular-crest",
    "radial-fingerprint",
    "morph-kaleidoscope",
    "crest-mandala",
    "counterform-kaleidoscope",
    "orbital-grammar",
    "topological-crest",
  ].includes(template);
}

function isAsymmetricTemplate(template) {
  return ["tectonics", "skeleton", "packing", "armature"].includes(template);
}

function usesRotatedGlyphSeed(template) {
  return isKaleidoscopeTemplate(template) || isAsymmetricTemplate(template);
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
    monochrome: inputs.monochrome.checked,
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
  if (usesRotatedGlyphSeed(state.template)) {
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

function makeGlyphGrid(state, pixels, countOverride = state.sectors) {
  const count = Math.max(2, Math.abs(Math.round(countOverride)));
  const extent = 700;
  const start = (SIZE - extent) / 2;
  const cellSize = extent / count;
  const threshold = state.fillThreshold / 100;
  const cells = [];
  const active = Array.from({ length: count }, () => Array(count).fill(false));

  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      const rect = {
        x: start + column * cellSize,
        y: start + row * cellSize,
        size: cellSize,
      };
      const coverage = sampleRectCoverage(rect, pixels);
      const isActive = coverage >= threshold;
      active[row][column] = isActive;
      cells.push({
        row,
        column,
        coverage,
        active: isActive,
        x: rect.x,
        y: rect.y,
        size: cellSize,
      });
    }
  }

  return { count, extent, start, cellSize, cells, active };
}

function makeDistanceField(active) {
  const count = active.length;
  const far = count * 2 + 1;
  const distance = active.map((row, rowIndex) =>
    row.map((isActive, columnIndex) => {
      if (!isActive) return 0;
      return rowIndex === 0 ||
        columnIndex === 0 ||
        rowIndex === count - 1 ||
        columnIndex === count - 1
        ? 1
        : far;
    })
  );

  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (!active[row][column]) continue;
      const top = row > 0 ? distance[row - 1][column] + 1 : 1;
      const left = column > 0 ? distance[row][column - 1] + 1 : 1;
      distance[row][column] = Math.min(distance[row][column], top, left);
    }
  }

  for (let row = count - 1; row >= 0; row -= 1) {
    for (let column = count - 1; column >= 0; column -= 1) {
      if (!active[row][column]) continue;
      const bottom = row < count - 1 ? distance[row + 1][column] + 1 : 1;
      const right = column < count - 1 ? distance[row][column + 1] + 1 : 1;
      distance[row][column] = Math.min(distance[row][column], bottom, right);
    }
  }

  return distance;
}

function makeTectonicZones(state, pixels) {
  const grid = makeGlyphGrid(state, pixels);
  const visited = Array.from({ length: grid.count }, () => Array(grid.count).fill(false));
  const zones = [];

  function canUse(row, column) {
    return (
      row >= 0 &&
      column >= 0 &&
      row < grid.count &&
      column < grid.count &&
      grid.active[row][column] &&
      !visited[row][column]
    );
  }

  for (let row = 0; row < grid.count; row += 1) {
    for (let column = 0; column < grid.count; column += 1) {
      if (!canUse(row, column)) continue;

      let columns = 1;
      let rows = 1;
      while (columns < 3 && canUse(row, column + columns)) columns += 1;
      while (rows < 3 && canUse(row + rows, column)) rows += 1;

      if (
        columns >= 2 &&
        rows >= 2 &&
        canUse(row + 1, column + 1) &&
        (row + column) % 3 === 0
      ) {
        columns = 2;
        rows = 2;
      } else if (columns >= rows) {
        rows = 1;
      } else {
        columns = 1;
      }

      let coverage = 0;
      for (let zoneRow = row; zoneRow < row + rows; zoneRow += 1) {
        for (let zoneColumn = column; zoneColumn < column + columns; zoneColumn += 1) {
          visited[zoneRow][zoneColumn] = true;
          coverage +=
            grid.cells[zoneRow * grid.count + zoneColumn].coverage / (rows * columns);
        }
      }

      const grammar = ["plate", "capsule", "wedge", "disc"];
      const shape =
        grammar[
          Math.abs(row * 7 + column * 11 + rows * 3 + columns * 5 + Math.round(coverage * 10)) %
            grammar.length
        ];
      zones.push({
        row,
        column,
        rows,
        columns,
        coverage,
        shape,
        x: grid.start + column * grid.cellSize,
        y: grid.start + row * grid.cellSize,
        width: columns * grid.cellSize,
        height: rows * grid.cellSize,
      });
    }
  }

  return {
    ...grid,
    zones,
    activeCount: grid.cells.filter((cell) => cell.active).length,
  };
}

function makeSkeletonGraph(state, pixels) {
  const grid = makeGlyphGrid(state, pixels);
  const distance = makeDistanceField(grid.active);
  const nodes = [];
  const nodeMap = new Map();

  for (let row = 0; row < grid.count; row += 1) {
    for (let column = 0; column < grid.count; column += 1) {
      if (!grid.active[row][column]) continue;
      const value = distance[row][column];
      let isRidge = true;

      for (let offsetRow = -1; offsetRow <= 1; offsetRow += 1) {
        for (let offsetColumn = -1; offsetColumn <= 1; offsetColumn += 1) {
          if (offsetRow === 0 && offsetColumn === 0) continue;
          const neighborRow = row + offsetRow;
          const neighborColumn = column + offsetColumn;
          if (
            neighborRow >= 0 &&
            neighborColumn >= 0 &&
            neighborRow < grid.count &&
            neighborColumn < grid.count &&
            distance[neighborRow][neighborColumn] > value
          ) {
            isRidge = false;
          }
        }
      }

      if (!isRidge) continue;
      const cell = grid.cells[row * grid.count + column];
      const node = {
        row,
        column,
        distance: value,
        coverage: cell.coverage,
        x: cell.x + grid.cellSize / 2,
        y: cell.y + grid.cellSize / 2,
        degree: 0,
      };
      nodeMap.set(`${row}:${column}`, nodes.length);
      nodes.push(node);
    }
  }

  const edgeKeys = new Set();
  const edges = [];
  nodes.forEach((node, nodeIndex) => {
    for (let radius = 1; radius <= 2; radius += 1) {
      const candidates = [];
      for (let offsetRow = -radius; offsetRow <= radius; offsetRow += 1) {
        for (let offsetColumn = -radius; offsetColumn <= radius; offsetColumn += 1) {
          if (Math.max(Math.abs(offsetRow), Math.abs(offsetColumn)) !== radius) continue;
          const targetIndex = nodeMap.get(`${node.row + offsetRow}:${node.column + offsetColumn}`);
          if (targetIndex !== undefined && targetIndex !== nodeIndex) candidates.push(targetIndex);
        }
      }
      if (!candidates.length) continue;

      candidates.slice(0, 2).forEach((targetIndex) => {
        const key = [nodeIndex, targetIndex].sort((a, b) => a - b).join(":");
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push({ from: nodeIndex, to: targetIndex });
        nodes[nodeIndex].degree += 1;
        nodes[targetIndex].degree += 1;
      });
      break;
    }
  });

  const parent = nodes.map((_, index) => index);
  function find(index) {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  }
  function union(first, second) {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent[secondRoot] = firstRoot;
  }
  edges.forEach((edge) => union(edge.from, edge.to));

  while (new Set(nodes.map((_, index) => find(index))).size > 1) {
    let nearest = null;
    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        if (find(first) === find(second)) continue;
        const distanceBetween = Math.hypot(
          nodes[first].x - nodes[second].x,
          nodes[first].y - nodes[second].y
        );
        if (!nearest || distanceBetween < nearest.distance) {
          nearest = { from: first, to: second, distance: distanceBetween };
        }
      }
    }
    if (!nearest) break;
    edges.push({ from: nearest.from, to: nearest.to });
    nodes[nearest.from].degree += 1;
    nodes[nearest.to].degree += 1;
    union(nearest.from, nearest.to);
  }

  return { ...grid, distance, nodes, edges };
}

function makePackedModules(state, pixels) {
  const resolution = Math.max(8, Math.abs(state.density) * 6);
  const grid = makeGlyphGrid(state, pixels, resolution);
  const distance = makeDistanceField(grid.active);
  const candidates = grid.cells
    .filter((cell) => cell.active)
    .map((cell) => {
      const clearance = distance[cell.row][cell.column];
      const radius =
        Math.min(clearance * grid.cellSize * 0.82, grid.cellSize * 3.2) *
          (state.rowWeight / 86) -
        state.cellGap * 0.5;
      return {
        ...cell,
        clearance,
        radius,
        centerX: cell.x + grid.cellSize / 2,
        centerY: cell.y + grid.cellSize / 2,
      };
    })
    .filter((candidate) => candidate.radius > 2)
    .sort(
      (first, second) =>
        second.radius - first.radius ||
        second.coverage - first.coverage ||
        first.row - second.row ||
        first.column - second.column
    );
  const modules = [];
  const maximum = Math.max(1, Math.abs(state.sectors));

  for (const candidate of candidates) {
    if (modules.length >= maximum) break;
    const overlaps = modules.some((module) => {
      const distanceBetween = Math.hypot(
        candidate.centerX - module.centerX,
        candidate.centerY - module.centerY
      );
      return distanceBetween < candidate.radius + module.radius + state.cellGap;
    });
    if (overlaps) continue;

    const grammar = ["circle", "square", "capsule"];
    modules.push({
      ...candidate,
      shape:
        grammar[
          Math.abs(candidate.row * 7 + candidate.column * 11 + modules.length) % grammar.length
        ],
      angle: ((candidate.row * 17 + candidate.column * 11) % 90) - 45,
    });
  }

  return { ...grid, distance, candidates, modules, maximum };
}

function makeArmatureModules(state, pixels) {
  const resolution = Math.min(32, Math.max(6, Math.abs(state.sectors)));
  const grid = makeGlyphGrid(state, pixels, resolution);
  const distance = makeDistanceField(grid.active);
  const modules = [];
  const directions = [
    { name: "horizontal", angle: 0, offsets: [[0, -1], [0, 1]] },
    { name: "vertical", angle: 90, offsets: [[-1, 0], [1, 0]] },
    { name: "diagonal-down", angle: 45, offsets: [[-1, -1], [1, 1]] },
    { name: "diagonal-up", angle: -45, offsets: [[-1, 1], [1, -1]] },
  ];

  function isActive(row, column) {
    return Boolean(grid.active[row]?.[column]);
  }

  grid.cells.forEach((cell) => {
    if (!cell.active) return;
    const cardinalDegree =
      Number(isActive(cell.row - 1, cell.column)) +
      Number(isActive(cell.row + 1, cell.column)) +
      Number(isActive(cell.row, cell.column - 1)) +
      Number(isActive(cell.row, cell.column + 1));
    const ranked = directions
      .map((direction, index) => ({
        ...direction,
        index,
        score: direction.offsets.reduce(
          (sum, [rowOffset, columnOffset]) =>
            sum + Number(isActive(cell.row + rowOffset, cell.column + columnOffset)),
          0
        ),
      }))
      .sort(
        (first, second) =>
          second.score - first.score ||
          Math.abs(cell.row * 7 + cell.column * 11 + first.index) % 4 -
            (Math.abs(cell.row * 7 + cell.column * 11 + second.index) % 4)
      );
    const direction = ranked[0];
    const clearance = distance[cell.row][cell.column];
    modules.push({
      ...cell,
      centerX: cell.x + grid.cellSize / 2,
      centerY: cell.y + grid.cellSize / 2,
      angle: direction.angle,
      direction: direction.name,
      junction: cardinalDegree >= 3 || direction.score === 0,
      clearance,
      length: grid.cellSize * (1.15 + Math.min(clearance, 3) * 0.18) - state.cellGap,
      thickness:
        grid.cellSize * Math.min(1.15, Math.max(0.12, Math.abs(state.rowWeight) / 120)) -
        state.cellGap * 0.18,
    });
  });

  return { ...grid, distance, modules };
}

function samplePixelAlpha(x, y, pixels) {
  const safeX = Math.max(0, Math.min(SIZE - 1, Math.round(x)));
  const safeY = Math.max(0, Math.min(SIZE - 1, Math.round(y)));
  return pixels[(safeY * SIZE + safeX) * 4 + 3] / 255;
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

function makeGlyphFeatureField(state, pixels, countOverride) {
  const count = Math.min(32, Math.max(4, Math.abs(Math.round(countOverride))));
  const grid = makeGlyphGrid(state, pixels, count);
  const distance = makeDistanceField(grid.active);
  const outside = Array.from({ length: count }, () => Array(count).fill(false));
  const queue = [];

  function addOutside(row, column) {
    if (
      row < 0 ||
      column < 0 ||
      row >= count ||
      column >= count ||
      grid.active[row][column] ||
      outside[row][column]
    ) {
      return;
    }
    outside[row][column] = true;
    queue.push([row, column]);
  }

  for (let index = 0; index < count; index += 1) {
    addOutside(0, index);
    addOutside(count - 1, index);
    addOutside(index, 0);
    addOutside(index, count - 1);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [row, column] = queue[cursor];
    addOutside(row - 1, column);
    addOutside(row + 1, column);
    addOutside(row, column - 1);
    addOutside(row, column + 1);
  }

  function coverageAt(row, column) {
    if (row < 0 || column < 0 || row >= count || column >= count) return 0;
    return grid.cells[row * count + column].coverage;
  }

  const features = grid.cells.map((cell) => {
    const scores = [
      coverageAt(cell.row, cell.column - 1) + coverageAt(cell.row, cell.column + 1),
      coverageAt(cell.row - 1, cell.column) + coverageAt(cell.row + 1, cell.column),
      coverageAt(cell.row - 1, cell.column - 1) + coverageAt(cell.row + 1, cell.column + 1),
      coverageAt(cell.row - 1, cell.column + 1) + coverageAt(cell.row + 1, cell.column - 1),
    ];
    const direction = scores.indexOf(Math.max(...scores));
    return {
      ...cell,
      depth: distance[cell.row][cell.column],
      counterform: !cell.active && !outside[cell.row][cell.column],
      direction,
      directionStrength: Math.max(...scores),
    };
  });

  return {
    ...grid,
    distance,
    outside,
    features,
    featureAt(row, column) {
      if (row < 0 || column < 0 || row >= count || column >= count) return undefined;
      return features[row * count + column];
    },
  };
}

function sampleRadialGlyphDescriptor(angle, state, pixels) {
  const samples = 64;
  const innerRadius = 22;
  const outerRadius = 360;
  const threshold = Math.max(0.08, state.fillThreshold / 100);
  const values = [];
  let transitions = 0;
  let filled = 0;
  let first = -1;
  let last = -1;
  let previous = false;

  for (let index = 0; index < samples; index += 1) {
    const ratio = index / (samples - 1);
    const point = polar(innerRadius + ratio * (outerRadius - innerRadius), angle);
    const active = samplePixelAlpha(point.x, point.y, pixels) >= threshold;
    values.push(active);
    if (active) {
      filled += 1;
      if (first < 0) first = index;
      last = index;
    }
    if (active !== previous) transitions += 1;
    previous = active;
  }
  if (previous) transitions += 1;

  return {
    angle,
    transitions,
    coverage: filled / samples,
    first: first < 0 ? 1 : first / (samples - 1),
    last: last < 0 ? 0 : last / (samples - 1),
    span: first < 0 ? 0 : (last - first + 1) / samples,
    segmentCount: Math.ceil(transitions / 2),
    values,
  };
}

function makeRadialFingerprint(state, pixels, options = {}) {
  const petals = Math.max(4, Math.abs(state.sectors));
  const layers = Math.max(1, Math.abs(state.density));
  const innerRadius = options.innerRadius ?? 72;
  const radialExtent = options.radialExtent ?? 310;
  const tracks = options.tracks ?? 1;
  const layerStep = radialExtent / layers;
  const slotCount = layers * tracks;
  const descriptors = Array.from({ length: slotCount }, (_, slot) => {
    const ratio = slotCount === 1 ? 0.5 : slot / (slotCount - 1);
    return sampleRadialGlyphDescriptor(12 + ratio * 156, state, pixels);
  });
  const modules = [];
  const weight = Math.min(1.45, Math.max(0.25, Math.abs(state.rowWeight) / 86));

  descriptors.forEach((descriptor, slot) => {
    if (descriptor.transitions === 0) return;
    const layer = Math.floor(slot / tracks);
    const track = slot % tracks;
    const wedge = 360 / petals;
    const radius = innerRadius + (layer + 0.54) * layerStep;
    const size =
      layerStep * (0.3 + Math.min(0.82, descriptor.coverage * 1.7)) * weight -
      state.cellGap;
    const length =
      layerStep * (0.62 + descriptor.span * 1.15) * weight - state.cellGap * 0.45;
    const shape =
      descriptor.segmentCount >= 2
        ? "ring"
        : descriptor.coverage > 0.42
          ? "bar"
          : descriptor.first > 0.34
            ? "diamond"
            : "petal";

    for (let petal = 0; petal < petals; petal += 1) {
      const angle = petal * wedge + (track - (tracks - 1) / 2) * wedge * 0.28;
      const point = polar(radius, angle);
      modules.push({
        layer,
        track,
        petal,
        angle,
        x: point.x,
        y: point.y,
        size,
        length,
        shape,
        coverage: descriptor.coverage,
        span: descriptor.span,
        transitions: descriptor.transitions,
        seedRow: layer,
        seedColumn: track,
      });
    }
  });

  return {
    petals,
    layers,
    tracks,
    innerRadius,
    radialExtent,
    layerStep,
    descriptors,
    modules,
    total: petals * slotCount,
  };
}

function makeMorphKaleidoscope(state, pixels) {
  const count = Math.min(24, Math.max(4, Math.abs(state.sectors)));
  const field = makeGlyphFeatureField(state, pixels, count);
  const modules = [];
  const last = count - 1;
  const levels = Math.max(1, Math.abs(state.density));
  const threshold = state.fillThreshold / 100;

  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      const coordinates = [
        [row, column],
        [row, last - column],
        [last - row, column],
        [last - row, last - column],
      ];
      if (state.symmetry === 8) {
        coordinates.push(
          [column, row],
          [last - column, row],
          [column, last - row],
          [last - column, last - row]
        );
      }
      const uniqueCoordinates = [...new Set(coordinates.map(([r, c]) => `${r}:${c}`))]
        .map((key) => key.split(":").map(Number))
        .sort(([rowA, columnA], [rowB, columnB]) => rowA - rowB || columnA - columnB);
      const samples = uniqueCoordinates.map(([sampleRow, sampleColumn]) =>
        field.featureAt(sampleRow, sampleColumn)
      );
      const maxCoverage = Math.max(...samples.map((sample) => sample.coverage));
      const activeSamples = samples.filter((sample) => sample.active);
      const counterSamples = samples.filter((sample) => sample.counterform);
      if (maxCoverage < threshold && counterSamples.length === 0) continue;

      const maxDepth = Math.max(0, ...activeSamples.map((sample) => sample.depth));
      const directionCounts = [0, 0, 0, 0];
      activeSamples.forEach((sample) => {
        directionCounts[sample.direction] += 1;
      });
      const dominantDirection = directionCounts.indexOf(Math.max(...directionCounts));
      const signature = samples.reduce(
        (value, sample, index) => value + (sample.active ? 2 ** index : 0),
        0
      );
      const stage = Math.min(levels - 1, Math.max(0, maxDepth - 1));
      const centerX = field.start + (column + 0.5) * field.cellSize;
      const centerY = field.start + (row + 0.5) * field.cellSize;
      const radialAngle = (Math.atan2(centerY - CENTER, centerX - CENTER) * 180) / Math.PI;
      let shape;
      if (counterSamples.length) shape = "ring";
      else if (maxDepth >= levels) shape = signature % 2 ? "circle" : "diamond";
      else if (dominantDirection <= 1) shape = signature % 2 ? "radial-bar" : "tangent-bar";
      else shape = signature % 3 ? "diamond" : "circle";

      modules.push({
        row,
        column,
        seedRow: Math.floor(Math.abs(row - last / 2)),
        seedColumn: Math.floor(Math.abs(column - last / 2)),
        x: field.start + column * field.cellSize,
        y: field.start + row * field.cellSize,
        size: field.cellSize,
        centerX,
        centerY,
        radialAngle,
        shape,
        stage,
        signature,
        maxDepth,
        coverage: activeSamples.length
          ? activeSamples.reduce((sum, sample) => sum + sample.coverage, 0) /
            activeSamples.length
          : 0,
      });
    }
  }

  return { ...field, modules, total: count * count, levels };
}

function makeCounterformKaleidoscope(state, pixels) {
  const morph = makeMorphKaleidoscope(state, pixels);
  const modules = morph.modules.map((module) => ({
    ...module,
    counterRole:
      module.shape === "ring"
        ? "void"
        : module.maxDepth >= morph.levels
          ? "mass"
          : "bridge",
  }));
  return { ...morph, modules };
}

function makeSymmetryOrbit(dx, dy, symmetry) {
  const points = [
    [dx, dy],
    [-dx, dy],
    [dx, -dy],
    [-dx, -dy],
  ];
  if (symmetry === 8) {
    points.push([dy, dx], [-dy, dx], [dy, -dx], [-dy, -dx]);
  }
  return [...new Set(points.map(([x, y]) => `${formatNumber(x)}:${formatNumber(y)}`))].map(
    (key) => key.split(":").map(Number)
  );
}

function makeOrbitalGrammar(state, pixels) {
  const count = Math.min(24, Math.max(6, Math.abs(state.sectors)));
  const field = makeGlyphFeatureField(state, pixels, count);
  const centerIndex = (count - 1) / 2;
  const maximumSeeds = Math.max(1, Math.abs(state.density) * 2);
  const candidates = field.features
    .filter((feature) => {
      const dx = feature.column - centerIndex;
      const dy = feature.row - centerIndex;
      if (dx < 0 || dy < 0) return false;
      if (state.symmetry === 8 && dy > dx) return false;
      return feature.active || feature.counterform;
    })
    .map((feature) => ({
      ...feature,
      score:
        feature.coverage +
        Math.min(feature.depth, 4) * 0.18 +
        (feature.counterform ? 0.9 : 0),
    }))
    .sort(
      (first, second) =>
        second.score - first.score || first.row - second.row || first.column - second.column
    )
    .slice(0, maximumSeeds);
  const modules = [];
  const weight = Math.min(1.4, Math.max(0.3, Math.abs(state.rowWeight) / 86));

  candidates.forEach((candidate, orbitIndex) => {
    const sourceX = candidate.x + field.cellSize / 2;
    const sourceY = candidate.y + field.cellSize / 2;
    const orbit = makeSymmetryOrbit(sourceX - CENTER, sourceY - CENTER, state.symmetry);
    const shape = candidate.counterform
      ? "ring"
      : candidate.depth >= Math.max(2, Math.abs(state.density))
        ? "circle"
        : candidate.direction <= 1
          ? "bar"
          : "diamond";
    const size =
      field.cellSize * (0.58 + Math.min(candidate.depth, 3) * 0.16) * weight -
      state.cellGap;

    orbit.forEach(([dx, dy], orbitPosition) => {
      modules.push({
        orbitIndex,
        orbitPosition,
        x: CENTER + dx,
        y: CENTER + dy,
        angle: (Math.atan2(dy, dx) * 180) / Math.PI + 90,
        size,
        length: size * (1.15 + candidate.score * 0.24),
        shape,
        coverage: candidate.coverage,
        transitions: candidate.counterform ? 4 : candidate.direction + 1,
        layer: orbitIndex,
        track: 0,
        petal: orbitPosition,
      });
    });
  });

  return { ...field, candidates, modules, maximumSeeds };
}

function countFeatureComponents(field, predicate) {
  const visited = Array.from({ length: field.count }, () => Array(field.count).fill(false));
  let components = 0;

  for (let row = 0; row < field.count; row += 1) {
    for (let column = 0; column < field.count; column += 1) {
      if (visited[row][column] || !predicate(field.featureAt(row, column))) continue;
      components += 1;
      const queue = [[row, column]];
      visited[row][column] = true;
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const [currentRow, currentColumn] = queue[cursor];
        [
          [currentRow - 1, currentColumn],
          [currentRow + 1, currentColumn],
          [currentRow, currentColumn - 1],
          [currentRow, currentColumn + 1],
        ].forEach(([nextRow, nextColumn]) => {
          if (
            nextRow < 0 ||
            nextColumn < 0 ||
            nextRow >= field.count ||
            nextColumn >= field.count ||
            visited[nextRow][nextColumn] ||
            !predicate(field.featureAt(nextRow, nextColumn))
          ) {
            return;
          }
          visited[nextRow][nextColumn] = true;
          queue.push([nextRow, nextColumn]);
        });
      }
    }
  }
  return components;
}

function makeTopologicalCrest(state, pixels) {
  const resolution = Math.min(24, Math.max(8, Math.abs(state.sectors) + 4));
  const field = makeGlyphFeatureField(state, pixels, resolution);
  const activeFeatures = field.features.filter((feature) => feature.active);
  const componentCount = countFeatureComponents(field, (feature) => feature.active);
  const counterCount = countFeatureComponents(field, (feature) => feature.counterform);
  const directionCounts = [0, 0, 0, 0];
  activeFeatures.forEach((feature) => {
    directionCounts[feature.direction] += 1;
  });
  const dominantDirection = directionCounts.indexOf(Math.max(...directionCounts));
  const edgeCount = activeFeatures.filter((feature) => {
    const neighbors = [
      field.featureAt(feature.row - 1, feature.column),
      field.featureAt(feature.row + 1, feature.column),
      field.featureAt(feature.row, feature.column - 1),
      field.featureAt(feature.row, feature.column + 1),
    ].filter(Boolean);
    return neighbors.filter((neighbor) => neighbor.active).length <= 2;
  }).length;
  const petals = Math.max(4, Math.abs(state.sectors));
  const weight = Math.min(1.35, Math.max(0.3, Math.abs(state.rowWeight) / 86));
  const modules = [];
  const layerSpecs = [
    {
      radius: 84,
      size: (42 + counterCount * 5) * weight - state.cellGap * 0.35,
      length: (52 + counterCount * 7) * weight,
      shape: counterCount ? "ring" : "diamond",
      signal: counterCount + 1,
    },
    {
      radius: 196,
      size: (48 + Math.min(componentCount, 4) * 5) * weight - state.cellGap * 0.35,
      length: (92 + Math.min(activeFeatures.length, 80) * 0.8) * weight,
      shape: dominantDirection <= 1 ? "bar" : "petal",
      signal: dominantDirection + 1,
    },
    {
      radius: 318,
      size: (44 + Math.min(edgeCount, 12) * 1.5) * weight - state.cellGap * 0.35,
      length: (58 + (edgeCount % 7) * 7) * weight,
      shape: edgeCount % 3 === 0 ? "diamond" : edgeCount % 3 === 1 ? "petal" : "ring",
      signal: edgeCount + componentCount,
    },
  ];

  layerSpecs.forEach((spec, layer) => {
    for (let petal = 0; petal < petals; petal += 1) {
      const angle = petal * (360 / petals);
      const point = polar(spec.radius, angle);
      modules.push({
        ...spec,
        layer,
        track: 0,
        petal,
        angle,
        x: point.x,
        y: point.y,
        coverage: activeFeatures.length / (field.count * field.count),
        transitions: spec.signal,
      });
    }
  });

  return {
    ...field,
    modules,
    petals,
    componentCount,
    counterCount,
    edgeCount,
    dominantDirection,
    total: petals * layerSpecs.length,
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

function appendFingerprintModule(group, module, palette) {
  if (module.size <= 1 || module.length <= 1) return;
  const fill =
    palette.accents[
      (module.layer * 2 + module.track + module.transitions) % palette.accents.length
    ];
  const item = createSvgElement("g", {
    "data-shape": module.shape,
    "data-layer-index": module.layer,
    "data-petal": module.petal,
    "data-transitions": module.transitions,
  });

  if (module.shape === "ring") {
    const radius = Math.max(module.size, module.length * 0.62) / 2;
    item.append(
      createSvgElement("circle", {
        cx: formatNumber(module.x),
        cy: formatNumber(module.y),
        r: formatNumber(radius),
        fill,
      }),
      createSvgElement("circle", {
        cx: formatNumber(module.x),
        cy: formatNumber(module.y),
        r: formatNumber(radius * (0.3 + module.coverage * 0.22)),
        fill: palette.background,
      })
    );
  } else if (module.shape === "bar") {
    item.append(
      createSvgElement("rect", {
        x: formatNumber(module.x - module.size * 0.28),
        y: formatNumber(module.y - module.length / 2),
        width: formatNumber(module.size * 0.56),
        height: formatNumber(module.length),
        fill,
        transform: `rotate(${formatNumber(module.angle)} ${formatNumber(module.x)} ${formatNumber(module.y)})`,
      })
    );
  } else if (module.shape === "diamond") {
    const size = Math.min(module.length, module.size * 1.15);
    item.append(
      createSvgElement("path", {
        d: diamondPathData({ x: module.x - size / 2, y: module.y - size / 2, size }),
        fill,
      })
    );
  } else {
    item.append(
      createSvgElement("ellipse", {
        cx: formatNumber(module.x),
        cy: formatNumber(module.y),
        rx: formatNumber(module.size * 0.34),
        ry: formatNumber(module.length * 0.5),
        fill,
        transform: `rotate(${formatNumber(module.angle)} ${formatNumber(module.x)} ${formatNumber(module.y)})`,
      })
    );
  }
  group.append(item);
}

function appendMorphModule(group, module, geometry, morph, state, palette) {
  if (!geometry) return;
  const weight = Math.min(1.35, Math.max(0.3, Math.abs(state.rowWeight) / 86));
  const stageScale = 0.62 + ((module.stage + 1) / (morph.levels + 1)) * 0.34;
  const size = geometry.size * stageScale * weight;
  if (size <= 1) return;
  const centerX = geometry.x + geometry.size / 2;
  const centerY = geometry.y + geometry.size / 2;
  const x = centerX - size / 2;
  const y = centerY - size / 2;
  const fill =
    palette.accents[(module.stage * 2 + module.signature) % palette.accents.length];
  const item = createSvgElement("g", {
    "data-shape": module.shape,
    "data-stage": module.stage,
    "data-signature": module.signature,
  });

  if (module.shape === "ring") {
    item.append(
      createSvgElement("rect", { x, y, width: size, height: size, fill }),
      createSvgElement("rect", {
        x: formatNumber(x + size * 0.28),
        y: formatNumber(y + size * 0.28),
        width: formatNumber(size * 0.44),
        height: formatNumber(size * 0.44),
        fill: palette.background,
      })
    );
  } else if (module.shape === "radial-bar" || module.shape === "tangent-bar") {
    const angle = module.radialAngle + (module.shape === "tangent-bar" ? 90 : 0);
    item.append(
      createSvgElement("rect", {
        x: formatNumber(centerX - size * 0.68),
        y: formatNumber(centerY - size * 0.22),
        width: formatNumber(size * 1.36),
        height: formatNumber(size * 0.44),
        fill,
        transform: `rotate(${formatNumber(angle)} ${formatNumber(centerX)} ${formatNumber(centerY)})`,
      })
    );
  } else if (module.shape === "circle") {
    item.append(
      createSvgElement("circle", {
        cx: formatNumber(centerX),
        cy: formatNumber(centerY),
        r: formatNumber(size / 2),
        fill,
      })
    );
  } else {
    item.append(createSvgElement("path", { d: diamondPathData({ x, y, size }), fill }));
  }
  group.append(item);
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
  const isTectonics = state.template === "tectonics";
  const isSkeleton = state.template === "skeleton";
  const isPacking = state.template === "packing";
  const isArmature = state.template === "armature";
  const isFingerprint = state.template === "radial-fingerprint";
  const isMorph = state.template === "morph-kaleidoscope";
  const isMandala = state.template === "crest-mandala";
  const isCounterform = state.template === "counterform-kaleidoscope";
  const isOrbital = state.template === "orbital-grammar";
  const isTopological = state.template === "topological-crest";
  const isSquareFamily = isSquare || isCrest;
  const hasReflectionControl =
    isSquareFamily || isMorph || isMandala || isCounterform || isOrbital;
  symmetryField.classList.toggle("is-hidden", !hasReflectionControl);
  densityField.classList.toggle("is-hidden", isSquareFamily || isTectonics || isSkeleton);
  rowWeightField.classList.toggle("is-hidden", isSquareFamily || isTectonics);

  if (isSquareFamily) sectorsLabel.textContent = "Модули по стороне";
  else if (isEmblem) sectorsLabel.textContent = "Лепестки";
  else if (isTectonics) sectorsLabel.textContent = "Сетка анализа";
  else if (isSkeleton) sectorsLabel.textContent = "Точность скелета";
  else if (isPacking) sectorsLabel.textContent = "Максимум фигур";
  else if (isArmature) sectorsLabel.textContent = "Точность штрихов";
  else if (isFingerprint) sectorsLabel.textContent = "Лепестки";
  else if (isMorph) sectorsLabel.textContent = "Модули по стороне";
  else if (isMandala) sectorsLabel.textContent = "Лепестки и модули";
  else if (isCounterform) sectorsLabel.textContent = "Модули по стороне";
  else if (isOrbital) sectorsLabel.textContent = "Точность орбит";
  else if (isTopological) sectorsLabel.textContent = "Оси герба";
  else sectorsLabel.textContent = "Секторы";

  densityLabel.textContent = isEmblem
    ? "Слои"
    : isPacking
      ? "Точность упаковки"
      : isFingerprint || isMorph || isMandala
              ? "Слои анализа"
              : isCounterform
                ? "Уровни контрформы"
                : isOrbital
                  ? "Орбиты-семена"
                  : isTopological
                    ? "Чувствительность"
      : "Ряды";
  rowWeightLabel.textContent = isEmblem
    ? "Размер модулей"
    : isSkeleton
      ? "Толщина связей %"
      : isPacking
        ? "Масштаб фигур %"
        : isArmature
          ? "Толщина штрихов %"
          : isFingerprint
                  ? "Размер отпечатка %"
                  : isMorph
                    ? "Масштаб модулей %"
                    : isMandala
                      ? "Баланс частей %"
                      : isCounterform
                        ? "Масштаб контрформ %"
                        : isOrbital
                          ? "Масштаб орбит %"
                          : isTopological
                            ? "Масштаб герба %"
        : "Толщина рядов";
  ringTwistLabel.textContent = usesRotatedGlyphSeed(state.template)
    ? "Поворот семени"
    : "Вращение рядов";

  if (isTectonics) metricLabel.textContent = "Тектоника: ячейки / зоны";
  else if (isSkeleton) metricLabel.textContent = "Скелет: узлы / связи";
  else if (isPacking) metricLabel.textContent = "Упаковка: кандидаты / фигуры";
  else if (isArmature) metricLabel.textContent = "Арматура: ячейки / штрихи";
  else if (isFingerprint) metricLabel.textContent = "Отпечаток: позиции / модули";
  else if (isMorph) metricLabel.textContent = "Морфология: сетка / модули";
  else if (isMandala) metricLabel.textContent = "Мандала: позиции / модули";
  else if (isCounterform) metricLabel.textContent = "Контрформа: модули / пустоты";
  else if (isOrbital) metricLabel.textContent = "Орбиты: семена / модули";
  else if (isTopological) metricLabel.textContent = "Топология: признаки / модули";
  else if (isKaleidoscopeTemplate(state.template))
    metricLabel.textContent = "Модули: сетка / заполнено";
  else metricLabel.textContent = "Ячейки: всего / после промежутков";
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

function appendFingerprintGuides(fingerprint, palette) {
  const grid = createSvgElement("g", {
    fill: "none",
    stroke: palette.guide,
    "stroke-width": 1.2,
    "data-layer": "grid",
  });
  for (let layer = 0; layer < fingerprint.layers; layer += 1) {
    grid.append(
      createSvgElement("circle", {
        cx: CENTER,
        cy: CENTER,
        r: formatNumber(
          fingerprint.innerRadius + (layer + 0.54) * fingerprint.layerStep
        ),
      })
    );
  }
  for (let petal = 0; petal < fingerprint.petals; petal += 1) {
    const point = polar(
      fingerprint.innerRadius + fingerprint.radialExtent,
      petal * (360 / fingerprint.petals)
    );
    grid.append(
      createSvgElement("path", {
        d: `M ${CENTER} ${CENTER} L ${formatNumber(point.x)} ${formatNumber(point.y)}`,
      })
    );
  }
  svg.append(grid);
}

function renderRadialFingerprint(state, palette, pixels) {
  const fingerprint = makeRadialFingerprint(state, pixels);
  const visibleModules = fingerprint.modules.filter(
    (module) => module.size > 1 && module.length > 1
  );
  cellCountOutput.value = `${fingerprint.total} / ${visibleModules.length}`;
  const mark = createSvgElement("g", { "data-layer": "mark" });
  visibleModules.forEach((module) => appendFingerprintModule(mark, module, palette));
  svg.append(mark);
  if (state.showGrid) appendFingerprintGuides(fingerprint, palette);
}

function appendMorphGridGuides(morph, palette, transform = "") {
  const grid = createSvgElement("g", {
    fill: "none",
    stroke: palette.guide,
    "stroke-width": 1.2,
    "data-layer": "grid",
    transform,
  });
  for (let row = 0; row < morph.count; row += 1) {
    for (let column = 0; column < morph.count; column += 1) {
      grid.append(
        createSvgElement("rect", {
          x: formatNumber(morph.start + column * morph.cellSize),
          y: formatNumber(morph.start + row * morph.cellSize),
          width: formatNumber(morph.cellSize),
          height: formatNumber(morph.cellSize),
        })
      );
    }
  }
  svg.append(grid);
}

function renderMorphKaleidoscope(state, palette, pixels) {
  const morph = makeMorphKaleidoscope(state, pixels);
  const renderable = morph.modules.filter((module) =>
    getSquareGeometry(module, state.cellGap)
  );
  cellCountOutput.value = `${morph.total} / ${renderable.length}`;
  const mark = createSvgElement("g", {
    "data-layer": "mark",
    transform: `translate(${CENTER} ${CENTER}) scale(1.16) translate(${-CENTER} ${-CENTER})`,
  });
  renderable.forEach((module) => {
    appendMorphModule(
      mark,
      module,
      getSquareGeometry(module, state.cellGap),
      morph,
      state,
      palette
    );
  });
  svg.append(mark);
  if (state.showGrid) {
    appendMorphGridGuides(
      morph,
      palette,
      `translate(${CENTER} ${CENTER}) scale(1.16) translate(${-CENTER} ${-CENTER})`
    );
  }
}

function renderCrestMandala(state, palette, pixels) {
  const morph = makeMorphKaleidoscope(state, pixels);
  const fingerprint = makeRadialFingerprint(state, pixels, {
    innerRadius: 188,
    radialExtent: 202,
    tracks: 1,
  });
  const morphModules = morph.modules.filter((module) =>
    getSquareGeometry(module, state.cellGap * 1.15)
  );
  const radialModules = fingerprint.modules.filter(
    (module) => module.size > 1 && module.length > 1
  );
  cellCountOutput.value = `${morph.total + fingerprint.total} / ${morphModules.length + radialModules.length}`;
  const mark = createSvgElement("g", { "data-layer": "mark" });
  const inner = createSvgElement("g", {
    transform: `translate(${CENTER} ${CENTER}) scale(0.72) translate(${-CENTER} ${-CENTER})`,
    "data-part": "square-core",
  });
  morphModules.forEach((module) => {
    appendMorphModule(
      inner,
      module,
      getSquareGeometry(module, state.cellGap * 1.15),
      morph,
      state,
      palette
    );
  });
  mark.append(inner);
  radialModules.forEach((module) => appendFingerprintModule(mark, module, palette));
  svg.append(mark);

  if (state.showGrid) {
    appendMorphGridGuides(
      morph,
      palette,
      `translate(${CENTER} ${CENTER}) scale(0.72) translate(${-CENTER} ${-CENTER})`
    );
    appendFingerprintGuides(fingerprint, palette);
  }
}

function renderCounterformKaleidoscope(state, palette, pixels) {
  const counterform = makeCounterformKaleidoscope(state, pixels);
  const renderable = counterform.modules.filter((module) =>
    getSquareGeometry(module, state.cellGap)
  );
  const voidCount = renderable.filter((module) => module.counterRole === "void").length;
  cellCountOutput.value = `${renderable.length} / ${voidCount}`;
  const mark = createSvgElement("g", {
    "data-layer": "mark",
    transform: `translate(${CENTER} ${CENTER}) scale(1.14) translate(${-CENTER} ${-CENTER})`,
  });
  renderable.forEach((module) => {
    let shape = module.shape;
    let stage = module.stage;
    if (module.counterRole === "void") {
      shape = "ring";
      stage = counterform.levels - 1;
    } else if (module.counterRole === "mass") {
      shape = module.signature % 2 ? "circle" : "diamond";
    } else {
      shape = module.signature % 2 ? "radial-bar" : "tangent-bar";
    }
    appendMorphModule(
      mark,
      { ...module, shape, stage },
      getSquareGeometry(module, state.cellGap),
      counterform,
      state,
      palette
    );
  });
  svg.append(mark);
  if (state.showGrid) {
    appendMorphGridGuides(
      counterform,
      palette,
      `translate(${CENTER} ${CENTER}) scale(1.14) translate(${-CENTER} ${-CENTER})`
    );
  }
}

function renderOrbitalGrammar(state, palette, pixels) {
  const orbital = makeOrbitalGrammar(state, pixels);
  const visibleModules = orbital.modules.filter(
    (module) => module.size > 1 && module.length > 1
  );
  cellCountOutput.value = `${orbital.candidates.length} / ${visibleModules.length}`;
  const mark = createSvgElement("g", { "data-layer": "mark" });
  visibleModules.forEach((module) => appendFingerprintModule(mark, module, palette));
  svg.append(mark);
  if (state.showGrid) appendGlyphGridGuides(orbital, palette);
}

function renderTopologicalCrest(state, palette, pixels) {
  const topology = makeTopologicalCrest(state, pixels);
  const visibleModules = topology.modules.filter(
    (module) => module.size > 1 && module.length > 1
  );
  cellCountOutput.value = `${topology.componentCount + topology.counterCount} / ${visibleModules.length + 1}`;
  const mark = createSvgElement("g", { "data-layer": "mark" });
  const coreFill = palette.accents[
    (topology.componentCount + topology.counterCount) % palette.accents.length
  ];
  if (topology.counterCount) {
    mark.append(
      createSvgElement("circle", {
        cx: CENTER,
        cy: CENTER,
        r: 48,
        fill: coreFill,
        "data-shape": "topology-core-ring",
      }),
      createSvgElement("circle", {
        cx: CENTER,
        cy: CENTER,
        r: 21,
        fill: palette.background,
      })
    );
  } else {
    mark.append(
      createSvgElement("path", {
        d: diamondPathData({ x: CENTER - 46, y: CENTER - 46, size: 92 }),
        fill: coreFill,
        "data-shape": "topology-core-diamond",
      })
    );
  }
  visibleModules.forEach((module) => appendFingerprintModule(mark, module, palette));
  svg.append(mark);
  if (state.showGrid) appendGlyphGridGuides(topology, palette);
}

function appendGlyphGridGuides(grid, palette) {
  const guides = createSvgElement("g", {
    fill: "none",
    stroke: palette.guide,
    "stroke-width": 1.2,
    "data-layer": "grid",
  });

  grid.cells.forEach((cell) => {
    guides.append(
      createSvgElement("rect", {
        x: formatNumber(cell.x),
        y: formatNumber(cell.y),
        width: formatNumber(cell.size),
        height: formatNumber(cell.size),
        "stroke-opacity": cell.active ? 1 : 0.35,
      })
    );
  });
  svg.append(guides);
  svg.append(
    createSvgElement("rect", {
      x: grid.start,
      y: grid.start,
      width: grid.extent,
      height: grid.extent,
      fill: "none",
      stroke: palette.guide,
      "stroke-width": 2,
      "data-layer": "boundary",
    })
  );
}

function renderTectonics(state, palette, pixels) {
  const tectonics = makeTectonicZones(state, pixels);
  const visibleZones = tectonics.zones.filter(
    (zone) => zone.width - state.cellGap > 1 && zone.height - state.cellGap > 1
  );
  cellCountOutput.value = `${tectonics.activeCount} / ${visibleZones.length}`;
  const mark = createSvgElement("g", { "data-layer": "mark" });

  visibleZones.forEach((zone, index) => {
    const inset = state.cellGap * 0.5;
    const x = zone.x + inset;
    const y = zone.y + inset;
    const width = zone.width - state.cellGap;
    const height = zone.height - state.cellGap;
    const fill = getModuleFill(
      {
        seedRow: zone.row,
        seedColumn: zone.column,
        coverage: zone.coverage,
        shape: zone.shape,
      },
      palette,
      index
    );
    let shape;

    if (zone.shape === "disc") {
      shape = createSvgElement("ellipse", {
        cx: formatNumber(x + width / 2),
        cy: formatNumber(y + height / 2),
        rx: formatNumber(width / 2),
        ry: formatNumber(height / 2),
        fill,
      });
    } else if (zone.shape === "capsule") {
      shape = createSvgElement("rect", {
        x: formatNumber(x),
        y: formatNumber(y),
        width: formatNumber(width),
        height: formatNumber(height),
        rx: formatNumber(Math.min(width, height) / 2),
        fill,
      });
    } else if (zone.shape === "wedge") {
      const cut = Math.min(width, height) * 0.28;
      shape = createSvgElement("path", {
        d: [
          `M ${formatNumber(x + cut)} ${formatNumber(y)}`,
          `L ${formatNumber(x + width)} ${formatNumber(y)}`,
          `L ${formatNumber(x + width - cut)} ${formatNumber(y + height)}`,
          `L ${formatNumber(x)} ${formatNumber(y + height)}`,
          "Z",
        ].join(" "),
        fill,
      });
    } else {
      shape = createSvgElement("rect", {
        x: formatNumber(x),
        y: formatNumber(y),
        width: formatNumber(width),
        height: formatNumber(height),
        fill,
      });
    }

    shape.setAttribute("data-shape", zone.shape);
    shape.setAttribute("data-zone", index);
    mark.append(shape);
  });
  svg.append(mark);
  if (state.showGrid) appendGlyphGridGuides(tectonics, palette);
}

function renderSkeleton(state, palette, pixels) {
  const skeleton = makeSkeletonGraph(state, pixels);
  cellCountOutput.value = `${skeleton.nodes.length} / ${skeleton.edges.length}`;
  const mark = createSvgElement("g", {
    "data-layer": "mark",
    transform: `translate(${CENTER} ${CENTER}) scale(1.35) translate(${-CENTER} ${-CENTER})`,
  });
  const strokeWidth = skeleton.cellSize * (state.rowWeight / 190);

  if (strokeWidth > 0) {
    skeleton.edges.forEach((edge, index) => {
      const from = skeleton.nodes[edge.from];
      const to = skeleton.nodes[edge.to];
      mark.append(
        createSvgElement("path", {
          d: `M ${formatNumber(from.x)} ${formatNumber(from.y)} L ${formatNumber(to.x)} ${formatNumber(to.y)}`,
          fill: "none",
          stroke: palette.accents[index % palette.accents.length],
          "stroke-width": formatNumber(strokeWidth),
          "stroke-linecap": "round",
          "data-shape": "link",
        })
      );
    });
  }

  skeleton.nodes.forEach((node, index) => {
    const radius =
      skeleton.cellSize * (0.18 + Math.min(3, node.distance) * 0.07) - state.cellGap * 0.12;
    if (radius <= 1) return;
    const fill = palette.accents[(node.degree + index) % palette.accents.length];
    let shape;

    if (node.degree <= 1) {
      shape = createSvgElement("path", {
        d: diamondPathData({
          x: node.x - radius,
          y: node.y - radius,
          size: radius * 2,
        }),
        fill,
      });
      shape.setAttribute("data-shape", "endpoint");
    } else if (node.degree >= 3) {
      shape = createSvgElement("circle", {
        cx: formatNumber(node.x),
        cy: formatNumber(node.y),
        r: formatNumber(radius),
        fill,
      });
      shape.setAttribute("data-shape", "junction");
    } else {
      shape = createSvgElement("rect", {
        x: formatNumber(node.x - radius),
        y: formatNumber(node.y - radius),
        width: formatNumber(radius * 2),
        height: formatNumber(radius * 2),
        fill,
        transform: `rotate(45 ${formatNumber(node.x)} ${formatNumber(node.y)})`,
      });
      shape.setAttribute("data-shape", "node");
    }
    mark.append(shape);
  });

  svg.append(mark);
  if (state.showGrid) appendGlyphGridGuides(skeleton, palette);
}

function renderPacking(state, palette, pixels) {
  const packing = makePackedModules(state, pixels);
  cellCountOutput.value = `${packing.candidates.length} / ${packing.modules.length}`;
  const mark = createSvgElement("g", { "data-layer": "mark" });

  packing.modules.forEach((module, index) => {
    const fill = palette.accents[index % palette.accents.length];
    let shape;

    if (module.shape === "square") {
      shape = createSvgElement("rect", {
        x: formatNumber(module.centerX - module.radius),
        y: formatNumber(module.centerY - module.radius),
        width: formatNumber(module.radius * 2),
        height: formatNumber(module.radius * 2),
        fill,
        transform: `rotate(${formatNumber(module.angle)} ${formatNumber(module.centerX)} ${formatNumber(module.centerY)})`,
      });
    } else if (module.shape === "capsule") {
      shape = createSvgElement("rect", {
        x: formatNumber(module.centerX - module.radius * 1.25),
        y: formatNumber(module.centerY - module.radius * 0.65),
        width: formatNumber(module.radius * 2.5),
        height: formatNumber(module.radius * 1.3),
        rx: formatNumber(module.radius * 0.65),
        fill,
        transform: `rotate(${formatNumber(module.angle)} ${formatNumber(module.centerX)} ${formatNumber(module.centerY)})`,
      });
    } else {
      shape = createSvgElement("circle", {
        cx: formatNumber(module.centerX),
        cy: formatNumber(module.centerY),
        r: formatNumber(module.radius),
        fill,
      });
    }

    shape.setAttribute("data-shape", module.shape);
    shape.setAttribute("data-pack-index", index);
    mark.append(shape);
  });

  svg.append(mark);
  if (state.showGrid) appendGlyphGridGuides(packing, palette);
}

function renderArmature(state, palette, pixels) {
  const armature = makeArmatureModules(state, pixels);
  const visibleModules = armature.modules.filter(
    (module) => module.length > 1 && module.thickness > 1
  );
  cellCountOutput.value = `${armature.cells.filter((cell) => cell.active).length} / ${visibleModules.length}`;
  const mark = createSvgElement("g", { "data-layer": "mark" });

  visibleModules.forEach((module, index) => {
    const directionIndex = [
      "horizontal",
      "vertical",
      "diagonal-down",
      "diagonal-up",
    ].indexOf(module.direction);
    const fill = palette.accents[Math.max(0, directionIndex) % palette.accents.length];
    const bar = createSvgElement("rect", {
      x: formatNumber(module.centerX - module.length / 2),
      y: formatNumber(module.centerY - module.thickness / 2),
      width: formatNumber(module.length),
      height: formatNumber(module.thickness),
      rx: formatNumber(Math.min(module.thickness * 0.16, 6)),
      fill,
      transform: `rotate(${module.angle} ${formatNumber(module.centerX)} ${formatNumber(module.centerY)})`,
      "data-shape": module.direction,
    });
    mark.append(bar);

    if (module.junction && (module.row + module.column) % 2 === 0) {
      const radius = Math.max(module.thickness * 0.3, armature.cellSize * 0.1);
      const shape = (module.row * 3 + module.column) % 4 === 0
        ? createSvgElement("circle", {
            cx: formatNumber(module.centerX),
            cy: formatNumber(module.centerY),
            r: formatNumber(radius),
            fill: palette.accents[(index + 2) % palette.accents.length],
          })
        : createSvgElement("path", {
            d: diamondPathData({
              x: module.centerX - radius,
              y: module.centerY - radius,
              size: radius * 2,
            }),
            fill: palette.accents[(index + 2) % palette.accents.length],
          });
      shape.setAttribute("data-shape", "junction");
      mark.append(shape);
    }
  });
  svg.append(mark);
  if (state.showGrid) appendGlyphGridGuides(armature, palette);
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
  const basePalette = palettes[state.palette];
  const palette = state.monochrome
    ? { ...basePalette, accents: basePalette.accents.map(() => basePalette.foreground) }
    : basePalette;
  updateControlContext(state);
  const pixels = drawSourceLetter(state);

  svg.setAttribute("data-template", state.template);
  svg.setAttribute("data-monochrome", state.monochrome ? "true" : "false");
  svg.setAttribute(
    "data-symmetry",
    ["radial-emblem", "radial-fingerprint", "topological-crest"].includes(state.template)
      ? `radial-${state.sectors}`
      : [
            "square-kaleidoscope",
            "modular-crest",
            "morph-kaleidoscope",
            "counterform-kaleidoscope",
            "orbital-grammar",
          ].includes(state.template)
        ? state.symmetry
        : state.template === "crest-mandala"
          ? `mandala-${state.sectors}-${state.symmetry}`
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
  } else if (state.template === "radial-fingerprint") {
    renderRadialFingerprint(state, palette, pixels);
  } else if (state.template === "morph-kaleidoscope") {
    renderMorphKaleidoscope(state, palette, pixels);
  } else if (state.template === "crest-mandala") {
    renderCrestMandala(state, palette, pixels);
  } else if (state.template === "counterform-kaleidoscope") {
    renderCounterformKaleidoscope(state, palette, pixels);
  } else if (state.template === "orbital-grammar") {
    renderOrbitalGrammar(state, palette, pixels);
  } else if (state.template === "topological-crest") {
    renderTopologicalCrest(state, palette, pixels);
  } else if (state.template === "tectonics") {
    renderTectonics(state, palette, pixels);
  } else if (state.template === "skeleton") {
    renderSkeleton(state, palette, pixels);
  } else if (state.template === "packing") {
    renderPacking(state, palette, pixels);
  } else if (state.template === "armature") {
    renderArmature(state, palette, pixels);
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

const modeParameterKeys = [
  "symmetry",
  "sectors",
  "density",
  "rowWeight",
  "cellGap",
  "fillThreshold",
  "ringTwist",
];

const modeDefaults = {
  "square-kaleidoscope": {
    symmetry: "8",
    sectors: "10",
    density: "3",
    rowWeight: "86",
    cellGap: "12",
    fillThreshold: "14",
    ringTwist: "12",
  },
  "radial-emblem": {
    symmetry: "8",
    sectors: "10",
    density: "3",
    rowWeight: "86",
    cellGap: "12",
    fillThreshold: "14",
    ringTwist: "12",
  },
  "modular-crest": {
    symmetry: "8",
    sectors: "10",
    density: "3",
    rowWeight: "86",
    cellGap: "12",
    fillThreshold: "14",
    ringTwist: "12",
  },
  "radial-fingerprint": {
    symmetry: "8",
    sectors: "10",
    density: "4",
    rowWeight: "88",
    cellGap: "10",
    fillThreshold: "14",
    ringTwist: "0",
  },
  "morph-kaleidoscope": {
    symmetry: "8",
    sectors: "10",
    density: "4",
    rowWeight: "80",
    cellGap: "10",
    fillThreshold: "14",
    ringTwist: "0",
  },
  "crest-mandala": {
    symmetry: "8",
    sectors: "8",
    density: "3",
    rowWeight: "76",
    cellGap: "10",
    fillThreshold: "14",
    ringTwist: "0",
  },
  "counterform-kaleidoscope": {
    symmetry: "8",
    sectors: "10",
    density: "4",
    rowWeight: "84",
    cellGap: "10",
    fillThreshold: "14",
    ringTwist: "0",
  },
  "orbital-grammar": {
    symmetry: "8",
    sectors: "12",
    density: "3",
    rowWeight: "92",
    cellGap: "9",
    fillThreshold: "14",
    ringTwist: "0",
  },
  "topological-crest": {
    symmetry: "8",
    sectors: "8",
    density: "3",
    rowWeight: "86",
    cellGap: "10",
    fillThreshold: "14",
    ringTwist: "0",
  },
  tectonics: {
    symmetry: "8",
    sectors: "10",
    density: "3",
    rowWeight: "86",
    cellGap: "12",
    fillThreshold: "14",
    ringTwist: "12",
  },
  skeleton: {
    symmetry: "8",
    sectors: "16",
    density: "3",
    rowWeight: "58",
    cellGap: "8",
    fillThreshold: "14",
    ringTwist: "12",
  },
  packing: {
    symmetry: "8",
    sectors: "10",
    density: "3",
    rowWeight: "86",
    cellGap: "12",
    fillThreshold: "14",
    ringTwist: "12",
  },
  armature: {
    symmetry: "8",
    sectors: "14",
    density: "3",
    rowWeight: "68",
    cellGap: "8",
    fillThreshold: "18",
    ringTwist: "0",
  },
};

function captureModeParameters() {
  return Object.fromEntries(modeParameterKeys.map((key) => [key, inputs[key].value]));
}

function applyModeParameters(parameters) {
  if (!parameters) return;
  modeParameterKeys.forEach((key) => {
    if (parameters[key] !== undefined) inputs[key].value = parameters[key];
  });
}

const modeParameterStates = new Map();
let activeTemplate = inputs.template.value;
modeParameterStates.set(activeTemplate, captureModeParameters());

function randomize() {
  const templates = [
    "square-kaleidoscope",
    "radial-emblem",
    "modular-crest",
    "radial-fingerprint",
    "morph-kaleidoscope",
    "crest-mandala",
    "counterform-kaleidoscope",
    "orbital-grammar",
    "topological-crest",
    "tectonics",
    "skeleton",
    "packing",
    "armature",
    "brick",
    "galaxy",
    "sunburst",
    "mixed",
    "barcode",
    "pulse",
    "burst",
    "rosette",
  ];
  const featuredTemplates = [
    "square-kaleidoscope",
    "radial-emblem",
    "modular-crest",
    "radial-fingerprint",
    "morph-kaleidoscope",
    "crest-mandala",
    "counterform-kaleidoscope",
    "orbital-grammar",
    "topological-crest",
    "tectonics",
    "skeleton",
    "packing",
    "armature",
  ];
  inputs.template.value =
    Math.random() < 0.65
      ? featuredTemplates[Math.floor(Math.random() * featuredTemplates.length)]
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
  activeTemplate = inputs.template.value;
  modeParameterStates.set(activeTemplate, captureModeParameters());
  render();
}

Object.entries(inputs).forEach(([key, input]) => {
  if (key !== "template") input.addEventListener("input", render);
});

inputs.template.addEventListener("change", () => {
  modeParameterStates.set(activeTemplate, captureModeParameters());
  activeTemplate = inputs.template.value;
  applyModeParameters(modeParameterStates.get(activeTemplate) || modeDefaults[activeTemplate]);
  render();
});

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
  } else if (state.template === "radial-fingerprint") {
    const fingerprint = makeRadialFingerprint(state, drawSourceLetter(state));
    cellCount = fingerprint.total;
    visibleCellCount = fingerprint.modules.filter(
      (module) => module.size > 1 && module.length > 1
    ).length;
  } else if (state.template === "morph-kaleidoscope") {
    const morph = makeMorphKaleidoscope(state, drawSourceLetter(state));
    cellCount = morph.total;
    visibleCellCount = morph.modules.filter((module) =>
      getSquareGeometry(module, state.cellGap)
    ).length;
  } else if (state.template === "crest-mandala") {
    const pixels = drawSourceLetter(state);
    const morph = makeMorphKaleidoscope(state, pixels);
    const fingerprint = makeRadialFingerprint(state, pixels, {
      innerRadius: 188,
      radialExtent: 202,
      tracks: 1,
    });
    cellCount = morph.total + fingerprint.total;
    visibleCellCount =
      morph.modules.filter((module) =>
        getSquareGeometry(module, state.cellGap * 1.15)
      ).length +
      fingerprint.modules.filter((module) => module.size > 1 && module.length > 1).length;
  } else if (state.template === "counterform-kaleidoscope") {
    const counterform = makeCounterformKaleidoscope(state, drawSourceLetter(state));
    cellCount = counterform.modules.length;
    visibleCellCount = counterform.modules.filter(
      (module) =>
        module.counterRole === "void" && getSquareGeometry(module, state.cellGap)
    ).length;
  } else if (state.template === "orbital-grammar") {
    const orbital = makeOrbitalGrammar(state, drawSourceLetter(state));
    cellCount = orbital.candidates.length;
    visibleCellCount = orbital.modules.filter(
      (module) => module.size > 1 && module.length > 1
    ).length;
  } else if (state.template === "topological-crest") {
    const topology = makeTopologicalCrest(state, drawSourceLetter(state));
    cellCount = topology.componentCount + topology.counterCount;
    visibleCellCount =
      topology.modules.filter((module) => module.size > 1 && module.length > 1).length + 1;
  } else if (state.template === "tectonics") {
    const tectonics = makeTectonicZones(state, drawSourceLetter(state));
    cellCount = tectonics.activeCount;
    visibleCellCount = tectonics.zones.filter(
      (zone) => zone.width - state.cellGap > 1 && zone.height - state.cellGap > 1
    ).length;
  } else if (state.template === "skeleton") {
    const skeleton = makeSkeletonGraph(state, drawSourceLetter(state));
    cellCount = skeleton.nodes.length;
    visibleCellCount = skeleton.edges.length;
  } else if (state.template === "packing") {
    const packing = makePackedModules(state, drawSourceLetter(state));
    cellCount = packing.candidates.length;
    visibleCellCount = packing.modules.length;
  } else if (state.template === "armature") {
    const armature = makeArmatureModules(state, drawSourceLetter(state));
    cellCount = armature.cells.filter((cell) => cell.active).length;
    visibleCellCount = armature.modules.filter(
      (module) => module.length > 1 && module.thickness > 1
    ).length;
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
