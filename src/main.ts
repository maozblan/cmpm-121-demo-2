import "./style.css";

const APP_NAME = "boopadoop";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;

const title = document.createElement("h1");
title.textContent = APP_NAME;
app.append(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
app.append(canvas);

let isDrawing: boolean = false;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
canvas.addEventListener("mousedown", (e) => {
  lines.push([{ x: e.offsetX, y: e.offsetY }]);
  isDrawing = true;
  document.dispatchEvent(drawingEvent);
});
canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    lines[lines.length - 1].push({ x: e.offsetX, y: e.offsetY });
    document.dispatchEvent(drawingEvent);
  }
});
document.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    lines[lines.length - 1].push({ x: e.offsetX, y: e.offsetY });
    document.dispatchEvent(drawingEvent);
    isDrawing = false;
  }
});
document.addEventListener("drawing-changed", () => {
  clearCanvas();
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; ++i) {
      drawLine(ctx, line[i].x, line[i].y, line[i + 1].x, line[i + 1].y);
    }
  }
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
  clearCanvas();
  lines.length = 0;
});
app.append(clearButton);

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

const drawingEvent: Event = new Event("drawing-changed");
interface Point {
  x: number;
  y: number;
}
const lines: Point[][] = [];
