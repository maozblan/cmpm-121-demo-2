import "./style.css";

const APP_NAME = "boopadoop";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

// utility //////////////////////////////////////////////////////////////////////
let brushWidth: number = 1;
let tool: "brush" | "sticker" = "brush";
let currentLine: Line | null = null;
const STICKER_SIZE: number = 32;
const THIN_BRUSH_WIDTH: number = 1;
const THICK_BRUSH_WIDTH: number = 5;
const DRAWING_CANVAS_SIZE: number = 256;
const EXPORT_CANVAS_SIZE: number = 1024;
const CURSOR_GROWTH_RATE: number = 0.05;
const CURSOR_GROWTH_MULTIPLIER: number = 13;

const observationDock: EventTarget = new EventTarget();
function observe(event: string, detail?: unknown) {
  observationDock.dispatchEvent(new CustomEvent(event, { detail }));
}
observationDock.addEventListener("drawing-changed", () => {
  displayDrawing();
});
observationDock.addEventListener("tool-moved", (event: Event) => {
  const cursorEvent = event as CustomEvent<Point | null>;
  if (cursorEvent.detail === null) {
    cursor.location = null;
  } else {
    cursor.update(cursorEvent.detail);
  }
  displayDrawing();
});

// @ts-ignore: all purpose function
// deno-lint-ignore no-explicit-any
function clearList(list: any[]) {
  list.length = 0;
}

interface Point {
  x: number;
  y: number;
}
interface Command {
  display: (ctx: CanvasRenderingContext2D) => void;
}
interface Line extends Command {
  points: Point[];
  width: number;
  extend: (point: Point) => void;
}
interface Sticker extends Command {
  location: Point;
  sticker: string;
}
interface CanvasCtx {
  content: Command[];
  undoBuffer: Command[];
  display: (ctx: CanvasRenderingContext2D) => void;
  add: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}
const canvasContent: CanvasCtx = {
  content: [],
  undoBuffer: [],
  display: function (ctx: CanvasRenderingContext2D): void {
    for (const command of this.content) {
      command.display(ctx);
    }
  },
  add: function (command: Command): void {
    this.content.push(command);
    clearList(this.undoBuffer);
    observe("drawing-changed");
  },
  undo: function () {
    if (this.content.length === 0) return;
    this.undoBuffer.unshift(this.content.pop()!);
    observe("drawing-changed");
  },
  redo: function () {
    if (this.undoBuffer.length === 0) return;
    this.content.push(this.undoBuffer.shift()!);
    observe("drawing-changed");
  },
  clear: function () {
    clearList(this.content);
    clearList(this.undoBuffer);
    observe("drawing-changed");
  },
};

interface Cursor extends Command {
  location: Point | null;
  style: string;
  update: (point: Point) => void;
}
const cursor: Cursor = {
  location: null,
  style: "*",
  display: function (ctx: CanvasRenderingContext2D): void {
    if (this.location === null) return;
    let cursorSize: number;
    if (tool === "brush") {
      cursorSize =
        CURSOR_GROWTH_MULTIPLIER * Math.log(brushWidth / CURSOR_GROWTH_RATE);
      ctx.font = `${cursorSize}px monospace`;
      const offset = ctx.measureText(this.style).width / 2;
      ctx.fillText(
        this.style,
        this.location.x - offset,
        this.location.y + offset
      );
    } else {
      cursorSize = STICKER_SIZE;
      ctx.font = `${cursorSize}px monospace`;
      ctx.fillText(this.style, this.location.x, this.location.y);
    }
  },
  update: function (point: Point): void {
    this.location = point;
  },
};

function newLine(start: Point, width: number): Line {
  return {
    points: [start],
    width,
    display: function (ctx: CanvasRenderingContext2D): void {
      for (let i = 0; i < this.points.length - 1; ++i) {
        drawLine(this.points[i], this.points[i + 1]);
      }

      function drawLine(start: Point, end: Point) {
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.lineWidth = width;
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.closePath();
      }
    },
    extend: function (point: Point): void {
      this.points.push(point);
    },
  };
}

function newSticker(position: Point, sticker: string): Sticker {
  return {
    location: position,
    sticker,
    display: function (ctx: CanvasRenderingContext2D): void {
      ctx.font = `${STICKER_SIZE}px monospace`;
      ctx.fillText(this.sticker, this.location.x, this.location.y);
    },
  };
}

// application interface //////////////////////////////////////////////////////
const title = document.createElement("h1");
title.textContent = APP_NAME;
app.append(title);

const contentContainer = document.createElement("div");
contentContainer.id = "content";
app.append(contentContainer);

const canvas = document.createElement("canvas");
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
canvas.width = canvas.height = DRAWING_CANVAS_SIZE;
contentContainer.append(canvas);

const toolBar_div = document.createElement("div");
toolBar_div.id = "tool-bar";
contentContainer.append(toolBar_div);

const buttonContainer = document.createElement("div");
toolBar_div.append(buttonContainer);

const clearButton = document.createElement("button");
clearButton.textContent = "clear";
clearButton.addEventListener("click", () => {
  canvasContent.clear();
});
buttonContainer.append(clearButton);

const undoButton = document.createElement("button");
undoButton.textContent = "undo";
undoButton.addEventListener("click", () => {
  canvasContent.undo();
});
buttonContainer.append(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "redo";
redoButton.addEventListener("click", () => {
  canvasContent.redo();
});
buttonContainer.append(redoButton);

const brushContainer = document.createElement("div");
toolBar_div.append(brushContainer);

const thinBrush = document.createElement("button");
thinBrush.textContent = "thin";
thinBrush.addEventListener("click", () => {
  brushWidth = THIN_BRUSH_WIDTH;
  tool = "brush";
  cursor.style = "*";
});
brushContainer.append(thinBrush);

const thickBrush = document.createElement("button");
thickBrush.textContent = "thick";
thickBrush.addEventListener("click", () => {
  brushWidth = THICK_BRUSH_WIDTH;
  tool = "brush";
  cursor.style = "*";
});
brushContainer.append(thickBrush);

const stickerContainer = document.createElement("div");
toolBar_div.append(stickerContainer);

const newStickerButton = document.createElement("button");
newStickerButton.textContent = "+";
newStickerButton.addEventListener("click", () => {
  const sticker = prompt("Enter a sticker character:");
  if (sticker === null) return;
  makeNewStickerButton(sticker);
});
stickerContainer.append(newStickerButton);

["🥕", "🥞", "✨"].forEach((sticker: string) => {
  makeNewStickerButton(sticker);
});

function makeNewStickerButton(sticker: string) {
  const stickerButton = document.createElement("button");
  stickerButton.textContent = sticker;
  stickerContainer.append(stickerButton);
  stickerButton.addEventListener("click", () => {
    tool = "sticker";
    cursor.style = sticker;
  });
}

const exportButton = document.createElement("button");
exportButton.textContent = "export";
exportButton.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = exportCanvas.height = EXPORT_CANVAS_SIZE;
  const exportCtx: CanvasRenderingContext2D = exportCanvas.getContext("2d")!;
  exportCtx.scale(
    exportCanvas.width / canvas.width,
    exportCanvas.height / canvas.height
  );
  canvasContent.display(exportCtx);
  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL("image/png");
  anchor.download = "sketchpad.png";
  anchor.click();
});
toolBar_div.append(exportButton);

// event listeners /////////////////////////////////////////////////////////////
canvas.addEventListener("mousedown", (e) => {
  if (tool === "brush") {
    currentLine = newLine({ x: e.offsetX, y: e.offsetY }, brushWidth);
    canvasContent.content.push(currentLine);
  }
});
canvas.addEventListener("mousemove", (e) => {
  if (currentLine !== null) {
    currentLine.extend({ x: e.offsetX, y: e.offsetY });
  }
  observe("tool-moved", { x: e.offsetX, y: e.offsetY });
});
canvas.addEventListener("mouseleave", () => {
  observe("tool-moved", null);
});
document.addEventListener("mouseup", (e) => {
  if (currentLine !== null) {
    currentLine.extend({ x: e.offsetX, y: e.offsetY });
    currentLine = null;
  }
  if (tool === "sticker" && cursor.location !== null) {
    canvasContent.add(newSticker({ x: e.offsetX, y: e.offsetY }, cursor.style));
  }
});

// loop ////////////////////////////////////////////////////////////////////////
function displayDrawing() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvasContent.display(ctx);
  cursor.display(ctx);
  requestAnimationFrame(displayDrawing);
}
displayDrawing();
