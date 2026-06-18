import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const mobileAssetsDir = path.join(repoRoot, "artifacts/ace-digital-mobile/assets");
const sourcePath = path.join(repoRoot, "artifacts/ace-digital-os/public/app-icon-source.png");

const OUTPUTS = [
  { file: "icon.png", size: 1024 },
  { file: "adaptive-icon.png", size: 1024 },
  { file: "favicon.png", size: 48 },
];

async function generateIcon(outputPath, size) {
  await sharp(sourcePath)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
}

async function main() {
  await mkdir(mobileAssetsDir, { recursive: true });

  const sourceMeta = await sharp(sourcePath).metadata();
  console.log(`Source icon metadata: ${sourceMeta.width}x${sourceMeta.height}`);

  for (const { file, size } of OUTPUTS) {
    const outputPath = path.join(mobileAssetsDir, file);
    await generateIcon(outputPath, size);
    console.log(`Wrote mobile asset: ${path.relative(repoRoot, outputPath)} (${size}x${size})`);
  }

  console.log("Mobile app icons successfully generated!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
