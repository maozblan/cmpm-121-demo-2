import "./style.css";

const APP_NAME = "boopadoop";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

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
};

const title = document.createElement("h1");
title.textContent = APP_NAME;
app.append(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
app.append(canvas);

const buttonContainer = document.createElement("div");
app.append(buttonContainer);

let isDrawing: boolean = false;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
canvas.addEventListener("mousedown", (e) => {
  newLine(canvasContent, { x: e.offsetX, y: e.offsetY });
  isDrawing = true;
});
canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    extendNextLine(canvasContent, { x: e.offsetX, y: e.offsetY });
  }
});
document.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    extendNextLine(canvasContent, { x: e.offsetX, y: e.offsetY });
    isDrawing = false;
  }
});
document.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvasContent.display(ctx);
});

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

const clearButton = document.createElement("button");
clearButton.textContent = "clear";
clearButton.addEventListener("click", () => {
  clear(canvasContent);
});
buttonContainer.append(clearButton);

const undoButton = document.createElement("button");
undoButton.textContent = "undo";
undoButton.addEventListener("click", () => {
  undo(canvasContent);
});
buttonContainer.append(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "redo";
redoButton.addEventListener("click", () => {
  redo(canvasContent);
});
buttonContainer.append(redoButton);

// @ts-ignore: all purpose function
// deno-lint-ignore no-explicit-any
function clearList(list: any[]) {
  list.length = 0;
}

function newLine(canvas: CanvasCtx, point: Point): void {
  canvas.lines.push([point]);
  document.dispatchEvent(drawingEvent);
  clearList(canvas.undoBuffer);
}

function extendNextLine(canvas: CanvasCtx, point: Point): void {
  if (canvas.lines.length === 0) return;
  canvas.lines[canvas.lines.length - 1].push(point);
  document.dispatchEvent(drawingEvent);
}

function undo(canvas: CanvasCtx) {
  if (canvas.lines.length === 0) return;
  canvas.undoBuffer.unshift(canvas.lines.pop()!);
  document.dispatchEvent(drawingEvent);
}

function redo(canvas: CanvasCtx) {
  if (canvas.undoBuffer.length === 0) return;
  canvas.lines.push(canvas.undoBuffer.shift()!);
  document.dispatchEvent(drawingEvent);
}

function clear(canvas: CanvasCtx) {
  clearList(canvas.lines);
  clearList(canvas.undoBuffer);
  document.dispatchEvent(drawingEvent);
}
