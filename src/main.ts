import "./style.css";

const APP_NAME = "boopadoop";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

// utility //////////////////////////////////////////////////////////////////////
let brushWidth: number = 1;
let tool: "brush" | "sticker" = "brush";
let currentLine: Line | null = null;
let currentColor: string | null = null;
const STICKER_SIZE: number = 32;
const THIN_BRUSH_WIDTH: number = 1;
const THICK_BRUSH_WIDTH: number = 5;
const DRAWING_CANVAS_SIZE: number = 256;
const EXPORT_CANVAS_SIZE: number = 1024;
const DEFAULT_BRUSH_COLOR: string = "black";

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
  color: string;
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
    ctx.fillStyle = currentColor ?? DEFAULT_BRUSH_COLOR;
    if (tool === "brush") {
      cursorSize = pixelToFontSize(brushWidth);
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

interface Palette {
  colors: string[];
  div: HTMLDivElement;
  add: (color: string) => void;
}
const palette: Palette = {
  colors: [],
  div: document.createElement("div"),
  add: function (color: string): void {
    if (!isHexColor(color)) {
      console.error("invalid color!");
      return;
    }
    this.colors.push(color);
    this.div.append(paletteButton(color));

    function isHexColor(c: string): boolean {
      return /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(c);
    }
    function paletteButton(c: string): HTMLButtonElement {
      const button = document.createElement("button");
      button.style.backgroundColor = c;
      button.addEventListener("click", () => {
        console.log(c);
        currentColor = c;
      });
      return button;
    }
  },
};

function newLine(start: Point, color: string, width: number): Line {
  return {
    points: [start],
    width,
    color,
    display: function (ctx: CanvasRenderingContext2D): void {
      for (let i = 0; i < this.points.length - 1; ++i) {
        drawLine(this.points[i], this.points[i + 1]);
      }

      function drawLine(start: Point, end: Point) {
        ctx.beginPath();
        ctx.strokeStyle = color;
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

function pixelToFontSize(num: number): number {
  const growthRate = 0.05;
  const growthMultiplier = 10;
  return growthMultiplier * Math.log(num / growthRate);
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

palette.div.id = "palette";
toolBar_div.append(palette.div);
// ms paint default colors
[
  // first row
  "#000000",
  "#7f7f7f",
  "#880015",
  "#ed1c24",
  "#ff7f27",
  "#fff200",
  "#22b14c",
  "#00a2e8",
  "#3f48cc",
  "#a349a4",
  // second row
  "#ffffff",
  "#c3c3c3",
  "#b97a57",
  "#ffaec9",
  "#ffc90e",
  "#efe4b0",
  "#b5e61d",
  "#99d9ea",
  "#7092be",
  "#c8bfe7",
].forEach((color) => {
  palette.add(color);
});

const utilityContainer = document.createElement("div");
toolBar_div.append(utilityContainer);

const clearButton = document.createElement("button");
clearButton.textContent = "clear";
clearButton.addEventListener("click", () => {
  canvasContent.clear();
});
utilityContainer.append(clearButton);

const undoButton = document.createElement("button");
undoButton.textContent = "undo";
undoButton.addEventListener("click", () => {
  canvasContent.undo();
});
utilityContainer.append(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "redo";
redoButton.addEventListener("click", () => {
  canvasContent.redo();
});
utilityContainer.append(redoButton);

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
    currentLine = newLine({ x: e.offsetX, y: e.offsetY }, currentColor ?? DEFAULT_BRUSH_COLOR, brushWidth);
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
