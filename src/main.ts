import "./style.css";

const APP_NAME = "boopadoop";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

// utility //////////////////////////////////////////////////////////////////////
let markerWidth: number = 1;

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
    const cursorSize = 13 * Math.log(markerWidth / 0.05);
    ctx.font = `${cursorSize}px monospace`;
    const offset = ctx.measureText(this.style).width / 2;
    ctx.fillText(
      this.style,
      this.location.x - offset,
      this.location.y + offset
    );
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

// application interface //////////////////////////////////////////////////////
const title = document.createElement("h1");
title.textContent = APP_NAME;
app.append(title);

const canvas = document.createElement("canvas");
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
canvas.width = 256;
canvas.height = 256;
app.append(canvas);

const buttonContainer = document.createElement("div");
app.append(buttonContainer);

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

const markerContainer = document.createElement("div");
app.append(markerContainer);

const thinMarker = document.createElement("button");
thinMarker.textContent = "thin";
thinMarker.addEventListener("click", () => {
  markerWidth = 1;
});
markerContainer.append(thinMarker);

const thickMarker = document.createElement("button");
thickMarker.textContent = "thick";
thickMarker.addEventListener("click", () => {
  markerWidth = 5;
});
markerContainer.append(thickMarker);

const stickerContainer = document.createElement("div");
app.append(stickerContainer);

["🥕", "🥞", "✨"].forEach((sticker: string) => {
  newSticker(sticker);
});

function newSticker(sticker: string) {
  const stickerButton = document.createElement("button");
  stickerButton.textContent = sticker;
  stickerContainer.append(stickerButton);
}

// event listeners /////////////////////////////////////////////////////////////
let currentLine: Line | null = null;
canvas.addEventListener("mousedown", (e) => {
  currentLine = newLine({ x: e.offsetX, y: e.offsetY }, markerWidth);
  canvasContent.content.push(currentLine);
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
});

// loop ////////////////////////////////////////////////////////////////////////
function displayDrawing() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvasContent.display(ctx);
  cursor.display(ctx);
  requestAnimationFrame(displayDrawing);
}
displayDrawing();
