import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push, onDisconnect } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// --- Firebase config ---
const firebaseConfig = {
    apiKey: "AIzaSyAZYVfNYB1SXBwBwnKo5X0vDbdilUa7VM4",
    authDomain: "fridge-2a6f6.firebaseapp.com",
    databaseURL: "https://fridge-2a6f6-default-rtdb.firebaseio.com",
    projectId: "fridge-2a6f6",
    storageBucket: "fridge-2a6f6.firebasestorage.app",
    messagingSenderId: "812932026202",
    appId: "1:812932026202:web:d28631897940dd1c696d63",
    measurementId: "G-XL6VGNMXEM"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- User ID ---
const userId = localStorage.userId ?? crypto.randomUUID();
localStorage.userId = userId;

const SCALE_FACTOR = 4;

let camera = {
  x: 0,
  y: 0,
  scale: 1
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const ZOOM_SPEED = 0.0015;

const DRAWING_BASE = {
  width: 110,
  height: 85
};

const MODAL_MAX_SCREEN_RATIO = 0.7;

// --- Fridge Canvas setup ---
const canvas = document.getElementById("fridgeCanvas");
const ctx = canvas.getContext("2d");

// --- Temp canvas ---
const strokeCanvas = document.createElement("canvas");
const strokeCtx = strokeCanvas.getContext("2d");

// --- Modal elements ---
const drawingModal = document.getElementById("drawingModal");
const drawingContainer = document.getElementById("drawingContainer");
const drawingCanvas = document.getElementById("drawingCanvas");
const drawingCtx = drawingCanvas.getContext("2d");
const doneButton = document.getElementById("doneButton");
const colorPicker = document.getElementById("colorPicker");

const toolState = {
  color: "#000000",
  brushSize: 2,
  tool: "brush" // later: "eraser"
};

const PALETTE_COLORS = [
  "#000000",
  "#444444", "#999999",
  "#ff0d00", "#ff9500", "#ffe600",
  "#13bd00", "#007aff",
  "#3431cc", "#D23489", "#7C1BA8"
];

const PALETTE_BASE = {
  swatchSize: 7,
  gap: 1
};

const drawingsRef = ref(db, "fridge");

// Initialize if empty
function createNewDrawing() {
  const newDrawingRef = push(drawingsRef);
  set(newDrawingRef, {
    x: 100,
    y: 100,
    width: 110,
    height: 85,
    color: "#ffffff",
    lockedBy: null,
    strokes: {}
  });
  return newDrawingRef.key; // the new drawing ID
}

const addDrawingBtn = document.getElementById("addDrawingBtn");

addDrawingBtn.addEventListener("click", () => {
  // Get camera center in world coordinates
  const centerX = (canvas.width / 2 - camera.x) / camera.scale;
  const centerY = (canvas.height / 2 - camera.y) / camera.scale;

  // Create new drawing in database
  const newDrawingRef = push(ref(db, "fridge"));
  const newDrawing = {
    x: centerX - DRAWING_BASE.width/2, // center it
    y: centerY - DRAWING_BASE.height/2,
    width: DRAWING_BASE.width,
    height: DRAWING_BASE.height,
    color: "#ffffff",
    lockedBy: null,
    strokes: {}
  };
  set(newDrawingRef, newDrawing);

  // Optionally, open modal immediately
  openDrawingModal(newDrawingRef.key);
});

let isPanning = false;
let panStart = { x: 0, y: 0 };

canvas.addEventListener("mouseup", () => {
  isPanning = false;
});

canvas.addEventListener("mouseleave", () => {
  isPanning = false;
});

canvas.addEventListener("wheel", e => {
  if (isModalDrawing) return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();

  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Convert screen → world
  const worldX = (mouseX - camera.x) / camera.scale;
  const worldY = (mouseY - camera.y) / camera.scale;

  const zoomAmount = 1 - e.deltaY * ZOOM_SPEED;
  const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.scale * zoomAmount));

  // Adjust camera so mouse stays in same world position
  camera.x = mouseX - worldX * newScale;
  camera.y = mouseY - worldY * newScale;
  camera.scale = newScale;

  drawFridge();
}, { passive: false });

function screenToWorld(x, y) {
  return {
    x: (x - camera.x) / camera.scale,
    y: (y - camera.y) / camera.scale
  };
}

function isOverDrawing(screenX, screenY) {
  const { x, y } = screenToWorld(screenX, screenY);

  return (
    x >= drawing.x &&
    x <= drawing.x + drawing.width &&
    y >= drawing.y &&
    y <= drawing.y + drawing.height
  );
}

function updateCursor(e) {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  if (dragging) {
    canvas.style.cursor = "grabbing";
    return;
  }

  if (isOverDrawing(screenX, screenY)) {
    canvas.style.cursor = "grab";
    return;
  }

  if (isPanning) {
    canvas.style.cursor = "move";
    return;
  }

  canvas.style.cursor = "default";
}

// Local state
let drawing = { x:0, y:0, width:110, height:85, color:"#ff0000", lockedBy:null, strokes:{} };
let dragging = false;

// Modal drawing state
let isModalDrawing = false;
let drawingIdOpen = null;
let currentStroke = [];

toolState.tool = "circle";        // "circle" or "eraser"
toolState.translucent = false;    // translucent flag

function drawStrokePoints(points, ctx, options = {}) {
  if (!points || points.length === 0) return;

  const {
    translucent = false,
    opacity = 0.3
  } = options;

  // Ensure offscreen matches target size
  if (
    strokeCanvas.width !== ctx.canvas.width ||
    strokeCanvas.height !== ctx.canvas.height
  ) {
    strokeCanvas.width = ctx.canvas.width;
    strokeCanvas.height = ctx.canvas.height;
  }

  if (translucent) {
    // 🔹 Draw entire stroke onto offscreen canvas
    strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
    strokeCtx.globalAlpha = 1;

    for (const p of points) {
      strokeCtx.beginPath();
      strokeCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      strokeCtx.fillStyle = p.color;
      strokeCtx.fill();
    }

    // 🔹 Composite ONCE with opacity
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(strokeCanvas, 0, 0);
    ctx.restore();

  } else {
    // 🔹 Opaque strokes draw directly
    ctx.save();
    ctx.globalAlpha = 1;

    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    ctx.restore();
  }
}

// --- Helper to draw a single stroke point ---
function drawStroke(point, offsetX = 0, offsetY = 0, ctxToUse = ctx) {

  ctxToUse.beginPath();
  ctxToUse.arc(
    point.x + offsetX,
    point.y + offsetY,
    point.radius,
    0,
    Math.PI * 2
  );
  ctxToUse.fillStyle = point.color;
  ctxToUse.fill();
}

// --- Realtime subscription ---
let drawings = {}; // local cache of all drawings

onValue(drawingsRef, snapshot => {
  const val = snapshot.val();
  if (!val) return;
  drawings = val;  // store all drawings
  drawFridge();    // redraw everything
});


function drawFridge() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);

  for (let drawingId in drawings) {
    const d = drawings[drawingId];

    // Draw background
    ctx.fillStyle = d.color;
    ctx.fillRect(d.x, d.y, d.width, d.height);

    // Clip to drawing rectangle
    ctx.save();
    ctx.beginPath();
    ctx.rect(d.x, d.y, d.width, d.height);
    ctx.clip();

    // Draw strokes
    drawAllStrokes(d, ctx);

    ctx.restore();
  }
}


// --- Draw all strokes on fridge canvas ---
function drawAllStrokes(d, ctxToUse = ctx) {
  if (!d.strokes) return;

  const scaleX = d.width / DRAWING_BASE.width;
  const scaleY = d.height / DRAWING_BASE.height;

  for (let strokeId in d.strokes) {
    const rawPoints = d.strokes[strokeId];

    const scaledPoints = rawPoints.map(p => ({
      x: p.x * scaleX + d.x,
      y: p.y * scaleY + d.y,
      radius: p.radius * scaleX,
      color: p.tool === "eraser" ? "#ffffff" : p.color
    }));

    drawStrokePoints(
      scaledPoints,
      ctxToUse,
      {
        translucent: rawPoints[0].translucent === true,
        opacity: 0.3
      }
    );
  }
}


function resizePalette(scale) {
  const swatchSize = Math.max(14, PALETTE_BASE.swatchSize * scale);
  const gap = Math.max(4, PALETTE_BASE.gap * scale);

  paletteEl.style.gap = gap + "px";

  document.querySelectorAll(".color-swatch").forEach(swatch => {
    swatch.style.width = swatchSize + "px";
    swatch.style.height = swatchSize + "px";
    swatch.style.borderRadius = (swatchSize * 0.5) + "px";
  });
}

function resizeDrawingModal() {
    const maxWidth = window.innerWidth * MODAL_MAX_SCREEN_RATIO;
    const maxHeight = window.innerHeight * MODAL_MAX_SCREEN_RATIO;

    const scale = Math.min(
        maxWidth / DRAWING_BASE.width,
        maxHeight / DRAWING_BASE.height
    );

    const canvasWidth = Math.floor(DRAWING_BASE.width * scale);
    const canvasHeight = Math.floor(DRAWING_BASE.height * scale);

    // Resize canvas resolution
    drawingCanvas.width = canvasWidth;
    drawingCanvas.height = canvasHeight;

    // Resize modal container
    drawingContainer.style.width = canvasWidth + "px";
    drawingContainer.style.fontSize =
        `${Math.max(12, scale * 3)}px`;

    brushSizeSlider.style.width = Math.floor(100 * scale) + "px";
    
    resizePalette(scale);

    return scale;
}

function openDrawingModal(drawingId) {
    drawing = drawings[drawingId];
    drawingModal.style.display = "flex";
    drawingIdOpen = drawingId;
    isModalDrawing = true;
    currentStroke = [];

    toolState.tool = "circle";
    toolState.translucent = false;
    updateBrushUI();

    const scale = resizeDrawingModal();

    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    if (drawing.strokes) {
        // Scale stored coordinates → modal canvas
        const scaleX = drawingCanvas.width / drawing.width;
        const scaleY = drawingCanvas.height / drawing.height;

        for (let strokeId in drawing.strokes) {
            const scaledPoints = drawing.strokes[strokeId].map(p => ({
            x: p.x * scaleX,
            y: p.y * scaleY,
            radius: p.radius * scaleX,
            color: p.tool === "eraser" ? "#ffffff" : p.color
            }));

            drawStrokePoints(
            scaledPoints,
            drawingCtx,
            {
                translucent: drawing.strokes[strokeId][0].translucent === true,
                opacity: 0.3
            }
            );
        }
    }
    redrawModalCanvas();
}

function closeDrawingModal() {
    drawingModal.style.display = "none";
    isModalDrawing = false;

    if (!drawingIdOpen) return;

    if (currentStroke.length > 0) {
        const strokesRef = ref(db, `fridge/${drawingIdOpen}/strokes`);
        const newStrokeRef = push(strokesRef);

        // Scale modal pixels → stored coordinates
        const scaleX = drawing.width / drawingCanvas.width;
        const scaleY = drawing.height / drawingCanvas.height;

        const scaledStroke = currentStroke.map(p => ({
            x: p.x * scaleX,
            y: p.y * scaleY,
            color: p.color ?? "#000000",
            radius: p.radius * scaleX,
            tool: p.tool ?? "circle",
            translucent: p.translucent ?? false
        }));

        set(newStrokeRef, scaledStroke);
    }

    update(ref(db, `fridge/${drawingIdOpen}`), { lockedBy: null });
    drawFridge();
    drawingIdOpen = null;
    currentStroke = [];
}

// --- Modal event listeners ---
let lastPoint = null;

drawingCanvas.addEventListener("mousedown", e => {
    if (!isModalDrawing) return;

    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentStroke.push({
    x,
    y,
    color: toolState.tool === "eraser" ? "#ffffff" : toolState.color,
    radius: toolState.brushSize,
    tool: toolState.tool,
    translucent: toolState.translucent
    });
    
    // Start new stroke: reset lastPoint
    lastPoint = { x, y };
    redrawModalCanvas();
});

drawingCanvas.addEventListener("mouseup", e => {
  if (!isModalDrawing || !currentStroke.length) return;

  const strokesRef = ref(db, `fridge/${drawingIdOpen}/strokes`);
  const newStrokeRef = push(strokesRef);

  const scaleX = drawing.width / drawingCanvas.width;
  const scaleY = drawing.height / drawingCanvas.height;

  const scaledStroke = currentStroke.map(p => ({
    x: p.x * scaleX,
    y: p.y * scaleY,
    radius: p.radius * scaleX,
    color: p.color ?? "#000000",
    tool: p.tool ?? "circle",
    translucent: p.translucent ?? false
  }));

  set(newStrokeRef, scaledStroke);

  currentStroke = [];
  lastPoint = null;
});

function redrawModalCanvas() {
  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

  if (!drawing.strokes) return;

  const scaleX = drawingCanvas.width / drawing.width;
  const scaleY = drawingCanvas.height / drawing.height;

  for (let strokeId in drawing.strokes) {
    const rawPoints = drawing.strokes[strokeId];

    const scaledPoints = rawPoints.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
      radius: p.radius * scaleX,
      color: p.tool === "eraser" ? "#ffffff" : p.color,
      translucent: p.translucent ?? false
    }));

    drawStrokePoints(
      scaledPoints,
      drawingCtx,
      {
        translucent: scaledPoints.some(p => p.translucent), // stroke translucent if any point is
        opacity: 0.3
      }
    );
  }

  // Draw current stroke on top
  if (currentStroke.length) {
    const scaledCurrent = currentStroke.map(p => ({
      ...p,
      x: p.x,
      y: p.y,
      radius: p.radius
    }));

    drawStrokePoints(
      scaledCurrent,
      drawingCtx,
      {
        translucent: scaledCurrent.some(p => p.translucent),
        opacity: 0.3
      }
    );
  }
}

// --- Modal mouse events scaled ---
drawingCanvas.addEventListener("mousemove", e => {
    if (!isModalDrawing || e.buttons !== 1) return;

    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastPoint) {
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        // Interpolate points between lastPoint and current mouse
        for (let i = 0; i < distance; i++) {
            const px = lastPoint.x + dx * (i / distance);
            const py = lastPoint.y + dy * (i / distance);

            const point = {
                x: px,
                y: py,
                color: toolState.tool === "eraser" ? "#ffffff" : toolState.color,
                radius: toolState.brushSize,
                tool: toolState.tool,
                translucent: toolState.translucent
            };

            currentStroke.push(point);
        }
    }

    lastPoint = { x, y };
    redrawModalCanvas();
});

doneButton.addEventListener("click", closeDrawingModal);

const paletteEl = document.getElementById("colorPalette");

PALETTE_COLORS.forEach(color => {
  const swatch = document.createElement("button");
  swatch.className = "color-swatch";
  swatch.style.background = color;
  swatch.dataset.color = color; // ✅ IMPORTANT

  swatch.addEventListener("click", () => {
    toolState.color = color;
    updatePaletteUI();
  });

  paletteEl.appendChild(swatch);
});

function updatePaletteUI() {
  document.querySelectorAll(".color-swatch").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.color === toolState.color
    );
  });
}

// Initialize selection
updatePaletteUI();

const toolButtons = document.querySelectorAll(".tool-btn");

toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const selectedTool = btn.dataset.tool;

    switch (selectedTool) {
      case "circle":
        toolState.tool = "circle";
        toolState.translucent = false;
        break;
      case "translucent":
        toolState.tool = "circle";
        toolState.translucent = true;
        break;
      case "eraser":
        toolState.tool = "eraser";
        toolState.translucent = false;
        break;
      case "undo":
        undoLastStroke();
        break;
      case "redo":
        redoStroke();
        break;
    }

    // Highlight active brush buttons only (not undo/redo)
    toolButtons.forEach(b => b.classList.remove("active"));
    if (selectedTool !== "undo" && selectedTool !== "redo") {
      btn.classList.add("active");
    }
  });
});

function updateBrushUI() {
  toolButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tool === toolState.tool || 
      (toolState.tool === "circle" && toolState.translucent && btn.dataset.tool === "translucent"));
  });
}

const brushSizeSlider = document.getElementById("brushSizeSlider");
const brushSizeDot = document.getElementById("brushSizeDot");

const MIN_BRUSH = 2;
const MAX_BRUSH = 50;

// Initialize
toolState.brushSize = 4;
updateBrushDot();

function updateBrushDot() {
  const percent = (toolState.brushSize - MIN_BRUSH) / (MAX_BRUSH - MIN_BRUSH);
  brushSizeDot.style.left = `${percent * 100}%`;
  brushSizeDot.style.width = `${toolState.brushSize * 2}px`;
  brushSizeDot.style.height = `${toolState.brushSize * 2}px`;
}

let draggingDot = false;

// Dragging dot logic stays the same
brushSizeDot.addEventListener("mousedown", e => {
  draggingDot = true;
  e.preventDefault();
});

// Add click & drag anywhere on the slider
brushSizeSlider.addEventListener("mousedown", e => {
  updateBrushSizeFromEvent(e);
  draggingDot = true;
});

// Update brush size on mousemove while dragging
document.addEventListener("mousemove", e => {
  if (!draggingDot) return;
  updateBrushSizeFromEvent(e);
});

// Stop dragging
document.addEventListener("mouseup", () => {
  draggingDot = false;
});

// Helper function
function updateBrushSizeFromEvent(e) {
  const rect = brushSizeSlider.getBoundingClientRect();
  let x = e.clientX - rect.left;
  x = Math.max(0, Math.min(rect.width, x)); // clamp to slider

  const percent = x / rect.width;
  toolState.brushSize = Math.round(MIN_BRUSH + percent * (MAX_BRUSH - MIN_BRUSH));
  updateBrushDot();
}

// Brush size change
brushSizeSlider.addEventListener("input", e => {
  toolState.brushSize = Number(e.target.value);
});

// --- Fridge canvas dragging ---
canvas.addEventListener("mousedown", e => {
  if (isModalDrawing) return;

  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);

  if (
    worldX >= drawing.x &&
    worldX <= drawing.x + drawing.width &&
    worldY >= drawing.y &&
    worldY <= drawing.y + drawing.height &&
    (!drawing.lockedBy || drawing.lockedBy === userId)
  ) {
    dragging = true;
    isPanning = false;

    canvas.style.cursor = "grabbing";

    update(drawingRef, { lockedBy: userId });
    drawFridge();
    onDisconnect(drawingRef).update({
        lockedBy: null
    });
    return;
  }

  isPanning = true;
  dragging = false;

  panStart.x = screenX - camera.x;
  panStart.y = screenY - camera.y;

  canvas.style.cursor = "move";
});


canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  if (dragging) {
    const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);

    update(drawingRef, {
      x: worldX - drawing.width / 2,
      y: worldY - drawing.height / 2
    });

    drawFridge();
    return;
  }

  if (isPanning) {
    camera.x = screenX - panStart.x;
    camera.y = screenY - panStart.y;
    drawFridge();
    return;
  }

  // Hover feedback
  if (isOverDrawing(screenX, screenY)) {
    canvas.style.cursor = "grab";
  } else {
    canvas.style.cursor = "default";
  }
});

canvas.addEventListener("mouseup", () => {
  if (dragging) {
    dragging = false;
    update(drawingRef, { lockedBy: null });
    drawFridge();
  }

  isPanning = false;
  canvas.style.cursor = "default";
});

canvas.addEventListener("mouseleave", () => {
  dragging = false;
  isPanning = false;
  canvas.style.cursor = "default";
});

// --- Double click opens modal ---
canvas.addEventListener("dblclick", e => {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);

  if (
    worldX >= drawing.x &&
    worldX <= drawing.x + drawing.width &&
    worldY >= drawing.y &&
    worldY <= drawing.y + drawing.height &&
    (!drawing.lockedBy || drawing.lockedBy === userId)
  ) {
    update(drawingRef, { lockedBy: userId });
    drawFridge();
    onDisconnect(drawingRef).update({
        lockedBy: null
    });
    openDrawingModal(drawingIdOpen);
  }
});


function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawFridge();
}

window.addEventListener("resize", () => {
  if (!isModalDrawing) return;

  const scale = resizeDrawingModal();

  redrawModalCanvas();
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();