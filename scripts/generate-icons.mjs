import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const outputDirectory = resolve("apps/word-addin/public/assets");

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  const nearestX = Math.max(left + radius, Math.min(x, right - radius));
  const nearestY = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function insideTriangle(x, y, a, b, c) {
  const sign = (p1, p2, p3) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const point = { x, y };
  const d1 = sign(point, a, b);
  const d2 = sign(point, b, c);
  const d3 = sign(point, c, a);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNegative && hasPositive);
}

function distanceToSegment(x, y, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared
    ? Math.max(
        0,
        Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared),
      )
    : 0;
  const nearestX = start.x + t * dx;
  const nearestY = start.y + t * dy;

  return Math.hypot(x - nearestX, y - nearestY);
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const setPixel = (x, y, [red, green, blue, alpha = 255]) => {
    const index = (y * size + x) * 4;
    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
    pixels[index + 3] = alpha;
  };

  const inset = Math.max(1, Math.round(size * 0.04));
  const radius = Math.max(2, Math.round(size * 0.22));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (
        insideRoundedRect(
          x,
          y,
          inset,
          inset,
          size - 1 - inset,
          size - 1 - inset,
          radius,
        )
      ) {
        setPixel(x, y, [40, 120, 189]);
      }
    }
  }

  const document = {
    left: Math.round(size * 0.24),
    top: Math.round(size * 0.17),
    right: Math.round(size * 0.76),
    bottom: Math.round(size * 0.83),
  };
  const documentRadius = Math.max(1, Math.round(size * 0.06));

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (
        insideRoundedRect(
          x,
          y,
          document.left,
          document.top,
          document.right,
          document.bottom,
          documentRadius,
        )
      ) {
        setPixel(x, y, [255, 255, 255]);
      }
    }
  }

  if (size >= 32) {
    const foldSize = Math.round(size * 0.14);
    const foldLeft = document.right - foldSize;
    const foldBottom = document.top + foldSize;

    for (let y = document.top; y <= foldBottom; y += 1) {
      for (let x = foldLeft; x <= document.right; x += 1) {
        if (
          insideTriangle(
            x,
            y,
            { x: foldLeft, y: document.top },
            { x: document.right, y: document.top },
            { x: document.right, y: foldBottom },
          )
        ) {
          setPixel(x, y, [219, 237, 249]);
        }
      }
    }
  }

  const lineLeft = Math.round(size * 0.34);
  const lineRight = Math.round(size * 0.62);
  const lineHeight = Math.max(1, Math.round(size * 0.055));
  const lineRadius = Math.max(1, Math.floor(lineHeight / 2));

  for (const centerY of [Math.round(size * 0.39), Math.round(size * 0.51)]) {
    const top = centerY - Math.floor(lineHeight / 2);
    const bottom = top + lineHeight;

    for (let y = top; y <= bottom; y += 1) {
      for (let x = lineLeft; x <= lineRight; x += 1) {
        if (insideRoundedRect(x, y, lineLeft, top, lineRight, bottom, lineRadius)) {
          setPixel(x, y, [40, 120, 189]);
        }
      }
    }
  }

  const curve = [
    { x: size * 0.3, y: size * 0.7 },
    { x: size * 0.43, y: size * 0.69 },
    { x: size * 0.56, y: size * 0.64 },
    { x: size * 0.69, y: size * 0.56 },
  ];
  const strokeRadius = Math.max(1, size * 0.045);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (
        curve
          .slice(0, -1)
          .some(
            (point, index) =>
              distanceToSegment(x, y, point, curve[index + 1]) <= strokeRadius,
          )
      ) {
        setPixel(x, y, [40, 166, 106]);
      }
    }
  }

  const arrowTip = { x: size * 0.73, y: size * 0.54 };
  const arrowTop = { x: size * 0.64, y: size * 0.5 };
  const arrowBottom = { x: size * 0.67, y: size * 0.61 };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (insideTriangle(x, y, arrowTip, arrowTop, arrowBottom)) {
        setPixel(x, y, [40, 166, 106]);
      }
    }
  }

  const scanlineLength = size * 4 + 1;
  const scanlines = Buffer.alloc(scanlineLength * size);

  for (let y = 0; y < size; y += 1) {
    const offset = y * scanlineLength;
    scanlines[offset] = 0;
    pixels.copy(scanlines, offset + 1, y * size * 4, (y + 1) * size * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(outputDirectory, { recursive: true });

for (const size of [16, 32, 80]) {
  const path = resolve(outputDirectory, `icon-${size}.png`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, createIcon(size));
}
