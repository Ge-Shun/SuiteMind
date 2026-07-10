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
  const radius = Math.max(2, Math.round(size * 0.18));

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
        setPixel(x, y, [27, 61, 88]);
      }
    }
  }

  const bandRadius = Math.max(1, Math.round(size * 0.08));
  const vertical = {
    left: Math.round(size * 0.2),
    top: Math.round(size * 0.16),
    right: Math.round(size * 0.48),
    bottom: Math.round(size * 0.84),
  };
  const horizontal = {
    left: Math.round(size * 0.34),
    top: Math.round(size * 0.38),
    right: Math.round(size * 0.82),
    bottom: Math.round(size * 0.64),
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (
        insideRoundedRect(
          x,
          y,
          vertical.left,
          vertical.top,
          vertical.right,
          vertical.bottom,
          bandRadius,
        )
      ) {
        setPixel(x, y, [46, 151, 91]);
      }

      if (
        insideRoundedRect(
          x,
          y,
          horizontal.left,
          horizontal.top,
          horizontal.right,
          horizontal.bottom,
          bandRadius,
        )
      ) {
        const color = x < Math.round(size * 0.48) ? [244, 181, 57] : [61, 143, 199];
        setPixel(x, y, color);
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
