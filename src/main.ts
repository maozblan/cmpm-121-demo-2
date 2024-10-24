import "./style.css";

const APP_NAME = "boopadoop";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

// utility //////////////////////////////////////////////////////////////////////
// @ts-ignore: all purpose function
// deno-lint-ignore no-explicit-any
function clearList(list: any[]) {
  list.length = 0;
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.closePath();
}

const drawingEvent: Event = new Event("drawing-changed");
interface Point {
  x: number;
  y: number;
}
type Line = Point[];
interface CanvasCtx {
  lines: Line[];
  undoBuffer: Line[];
  display: (ctx: CanvasRenderingContext2D) => void;
  newLine: (point: Point) => void;
  extendNextLine: (point: Point) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}
const canvasContent: CanvasCtx = {
  lines: [],
  undoBuffer: [],
  display: function (ctx: CanvasRenderingContext2D): void {
    this.lines.forEach((line) => {
      for (let i = 0; i < line.length - 1; ++i) {
        drawLine(ctx, line[i].x, line[i].y, line[i + 1].x, line[i + 1].y);
      }
    });
  },
  newLine: function (point: Point): void {
    this.lines.push([point]);
    document.dispatchEvent(drawingEvent);
    clearList(this.undoBuffer);
  },
  extendNextLine: function (point: Point): void {
    if (this.lines.length === 0) return;
    this.lines[this.lines.length - 1].push(point);
    document.dispatchEvent(drawingEvent);
  },
  undo: function () {
    if (this.lines.length === 0) return;
    this.undoBuffer.unshift(this.lines.pop()!);
    document.dispatchEvent(drawingEvent);
  },
  redo: function () {
    if (this.undoBuffer.length === 0) return;
    this.lines.push(this.undoBuffer.shift()!);
    document.dispatchEvent(drawingEvent);
  },
  clear: function () {
    clearList(this.lines);
    clearList(this.undoBuffer);
    document.dispatchEvent(drawingEvent);
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

// event listeners /////////////////////////////////////////////////////////////
let isDrawing: boolean = false;
canvas.addEventListener("mousedown", (e) => {
  canvasContent.newLine({ x: e.offsetX, y: e.offsetY });
  isDrawing = true;
});
canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    canvasContent.extendNextLine({ x: e.offsetX, y: e.offsetY });
  }
});
document.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    canvasContent.extendNextLine({ x: e.offsetX, y: e.offsetY });
    isDrawing = false;
  }
});
document.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvasContent.display(ctx);
});
