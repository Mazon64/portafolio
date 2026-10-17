import { mkdir } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import sharp from "sharp";

// Same Font Awesome marks as the portfolio, rasterized for email clients.
// Icons: CC BY 4.0, https://fontawesome.com/license/free
await mkdir("public/brand/email", { recursive: true });
for (const [name, Icon] of [["github", FaGithub], ["linkedin", FaLinkedin]]) {
  const svg = renderToStaticMarkup(createElement(Icon, { size: 64, color: "#171717", xmlns: "http://www.w3.org/2000/svg" }));
  await sharp(Buffer.from(svg)).resize(64, 64).flatten({ background: "#ffffff" }).png().toFile(`public/brand/email/${name}.png`);
}
