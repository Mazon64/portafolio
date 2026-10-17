import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// The editable master drives every export, including the legacy ICO.
const master = await readFile(new URL("../public/brand/isotype.svg", import.meta.url), "utf8");
const paths = master.match(/<path\b[^>]*\/>/g).join("");
const svg = (body, viewBox) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">${body}</svg>\n`;
const icon = svg(`<rect width="80" height="80" rx="18" fill="#171717"/><g transform="translate(8 8)">${paths.replaceAll("#171717", "#fafafa")}</g>`, "0 0 80 80");
await writeFile("src/app/icon.svg", icon);
await sharp(Buffer.from(icon)).resize(180, 180).png().toFile("src/app/apple-icon.png");
await sharp(Buffer.from(icon)).resize(512, 512).png().toFile("public/brand/avatar.png");
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => sharp(Buffer.from(icon)).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((image, index) => {
  const at = 6 + index * 16;
  header[at] = sizes[index]; header[at + 1] = sizes[index];
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(image.length, at + 8); header.writeUInt32LE(offset, at + 12);
  offset += image.length;
});
await writeFile("src/app/favicon.ico", Buffer.concat([header, ...images]));
for (const [variant, color] of [["light", "#171717"], ["dark", "#fafafa"]]) {
  const logo = svg(`<g transform="translate(0 4)">${paths.replaceAll("#171717", color)}</g><text x="82" y="46" fill="${color}" font-family="Geist, Arial, sans-serif" font-size="30" font-weight="500" letter-spacing="-1.35">David Aranda.</text>`, "0 0 280 72");
  await writeFile(`public/brand/logotype-${variant}.svg`, logo);
}
