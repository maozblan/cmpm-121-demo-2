import "./style.css";

const APP_NAME = "boopadoop";
const app = document.querySelector<HTMLDivElement>("#app")!;

document.title = APP_NAME;
// app.innerHTML = APP_NAME;

const title = document.createElement("h1");
title.textContent = APP_NAME;
app.append(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
app.append(canvas);

let x: number = 0;
let y: number = 0;
let isDrawing: boolean = false;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
canvas.addEventListener("mousedown", (e) => {
  x = e.offsetX;
  y = e.offsetY;
  isDrawing = true;
});
canvas.addEventListener("mousemove", (e) => {
  if (isDrawing) {
    drawLine(ctx, x, y, e.offsetX, e.offsetY);
    x = e.offsetX;
    y = e.offsetY;
  }
});
document.addEventListener("mouseup", (e) => {
  if (isDrawing) {
    drawLine(ctx, x, y, e.offsetX, e.offsetY);
    x = 0;
    y = 0;
    isDrawing = false;
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
app.append(clearButton);
