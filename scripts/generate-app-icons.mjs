import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicDir = path.join(repoRoot, "artifacts/ace-digital-os/public");
const iconsDir = path.join(publicDir, "icons");
const sourcePath = path.join(publicDir, "app-icon-source.png");

const OUTPUTS = [
  { file: "favicon-16.png", size: 16, dir: publicDir },
  { file: "favicon-32.png", size: 32, dir: publicDir },
  { file: "icon-16.png", size: 16, dir: iconsDir },
  { file: "icon-32.png", size: 32, dir: iconsDir },
  { file: "icon-48.png", size: 48, dir: iconsDir },
  { file: "icon-180.png", size: 180, dir: iconsDir },
  { file: "icon-192.png", size: 192, dir: iconsDir },
  { file: "icon-512.png", size: 512, dir: iconsDir },
  { file: "icon-512-maskable.png", size: 512, dir: iconsDir },
];

async function generateIcon(outputPath, size) {
  await sharp(sourcePath)
    .resize(size, size, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
}

async function main() {
  await mkdir(iconsDir, { recursive: true });

  const sourceMeta = await sharp(sourcePath).metadata();
  if (!sourceMeta.width || !sourceMeta.height || sourceMeta.width !== sourceMeta.height) {
    throw new Error(`Source icon must be square. Got ${sourceMeta.width}x${sourceMeta.height}`);
  }

  for (const { file, size, dir } of OUTPUTS) {
    const outputPath = path.join(dir, file);
    await generateIcon(outputPath, size);
    console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${size}x${size})`);
  }

  console.log("App icons generated from app-icon-source.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
