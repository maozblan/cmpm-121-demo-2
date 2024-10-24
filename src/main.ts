import "./style.css";

const APP_NAME = "boopadoop";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

// utility //////////////////////////////////////////////////////////////////////
const observationDock: EventTarget = new EventTarget();
function observe(event: string, detail?: unknown) {
  observationDock.dispatchEvent(new CustomEvent(event, { detail }));
}
observationDock.addEventListener("drawing-changed", () => {
  canvasContent.display(ctx);
});
observationDock.addEventListener("tool-moved", (event: Event) => {
  const cursorEvent = event as CustomEvent<Point>;
  const { x, y } = cursorEvent.detail;
  canvasContent.cursor.location = { x, y };
  canvasContent.display(ctx);
});

// @ts-ignore: all purpose function
// deno-lint-ignore no-explicit-any
function clearList(list: any[]) {
  list.length = 0;
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  lineWidth: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.lineWidth = lineWidth;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}
function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.font = "32px monospace";
  ctx.fillText("*", x - 8, y + 16);
}

const drawingEvent: Event = new Event("drawing-changed");
interface Point {
  x: number;
  y: number;
}
interface Line {
  points: Point[];
  width: number;
}
interface CanvasCtx {
  lines: Line[];
  undoBuffer: Line[];
  cursor: {
    location: Point;
  };
  display: (ctx: CanvasRenderingContext2D) => void;
  newLine: (point: Point, width: number) => void;
  extendNextLine: (point: Point) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}
const canvasContent: CanvasCtx = {
  lines: [],
  undoBuffer: [],
  cursor: {
    location: { x: 0, y: 0 },
  },
  display: function (ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.lines.forEach((line) => {
      for (let i = 0; i < line.points.length - 1; ++i) {
        drawLine(
          ctx,
          line.width,
          line.points[i].x,
          line.points[i].y,
          line.points[i + 1].x,
          line.points[i + 1].y
        );
      }
    });
    drawCursor(ctx, this.cursor.location.x, this.cursor.location.y);
  },
  newLine: function (point: Point, width: number): void {
    this.lines.push({ points: [point], width });
    document.dispatchEvent(drawingEvent);
    clearList(this.undoBuffer);
  },
  extendNextLine: function (point: Point): void {
    if (this.lines.length === 0) return;
    this.lines[this.lines.length - 1].points.push(point);
    observe("drawing-changed");
  },
  undo: function () {
    if (this.lines.length === 0) return;
    this.undoBuffer.unshift(this.lines.pop()!);
    observe("drawing-changed");
  },
  redo: function () {
    if (this.undoBuffer.length === 0) return;
    this.lines.push(this.undoBuffer.shift()!);
    observe("drawing-changed");
  },
  clear: function () {
    clearList(this.lines);
    clearList(this.undoBuffer);
    observe("drawing-changed");
  },
};

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
  markerThickness = 1;
});
markerContainer.append(thinMarker);

const thickMarker = document.createElement("button");
thickMarker.textContent = "thick";
thickMarker.addEventListener("click", () => {
  markerThickness = 5;
});
markerContainer.append(thickMarker);

// event listeners /////////////////////////////////////////////////////////////
let isDrawing: boolean = false;
let markerThickness = 1;
canvas.addEventListener("mousedown", (e) => {
  canvasContent.newLine({ x: e.offsetX, y: e.offsetY }, markerThickness);
  isDrawing = true;
});
canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    canvasContent.extendNextLine({ x: e.offsetX, y: e.offsetY });
  }
  observe("tool-moved", { x: e.offsetX, y: e.offsetY });
});
canvas.addEventListener("mouseleave", () => {
  observe("tool-moved", { x: -42, y: -42 });
});
document.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    canvasContent.extendNextLine({ x: e.offsetX, y: e.offsetY });
    isDrawing = false;
  }
});

// loop ////////////////////////////////////////////////////////////////////////
function tick() {
  canvasContent.display(ctx);
  requestAnimationFrame(tick);
}
tick();
