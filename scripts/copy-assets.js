// Skopíruje statické súbory (HTML, CSS, ikony), ktoré tsc nekompiluje,
// do priečinka dist/renderer, kde už leží skompilovaný renderer.js.
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "src", "renderer");
const destDir = path.join(__dirname, "..", "dist", "renderer");

fs.mkdirSync(destDir, { recursive: true });

const filesToCopy = ["index.html", "style.css", "favicon.svg"];

for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  fs.copyFileSync(src, dest);
  console.log(`Skopírované: ${file}`);
}

// Skopíruje aj priečinok s ikonami appky (assets/) rekurzívne.
const assetsSrc = path.join(srcDir, "assets");
const assetsDest = path.join(destDir, "assets");
if (fs.existsSync(assetsSrc)) {
  fs.mkdirSync(assetsDest, { recursive: true });
  for (const file of fs.readdirSync(assetsSrc)) {
    fs.copyFileSync(path.join(assetsSrc, file), path.join(assetsDest, file));
    console.log(`Skopírované: assets/${file}`);
  }
}
