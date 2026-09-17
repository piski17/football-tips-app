// Skopíruje statické súbory (HTML, CSS), ktoré tsc nekompiluje,
// do priečinka dist/renderer, kde už leží skompilovaný renderer.js.
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "src", "renderer");
const destDir = path.join(__dirname, "..", "dist", "renderer");

fs.mkdirSync(destDir, { recursive: true });

const filesToCopy = ["index.html", "style.css"];

for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  fs.copyFileSync(src, dest);
  console.log(`Skopírované: ${file}`);
}
