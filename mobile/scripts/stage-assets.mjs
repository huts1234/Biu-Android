import { access, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const flavor = process.argv[2];

if (flavor !== "phone" && flavor !== "pad") {
  console.error("Usage: node mobile/scripts/stage-assets.mjs <phone|pad>");
  process.exit(1);
}

const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(mobileDir, "android/app/src/main/assets/public");
const assetsDir = path.join(mobileDir, `android/app/src/${flavor}/assets`);
const destination = path.join(assetsDir, "public");

try {
  await access(source);
} catch {
  console.error(`No web bundle found at ${source}. Run "cap sync android" first.`);
  process.exit(1);
}

await rm(destination, { force: true, recursive: true });
await mkdir(assetsDir, { recursive: true });
await rename(source, destination);

console.log(`Staged web bundle for "${flavor}" at android/app/src/${flavor}/assets/public`);
