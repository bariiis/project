import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadLibrary } from "./node";
import { compile, isMediaSlot, TARGETS } from "./index";

const root = resolve(import.meta.dirname, "../../../library");
const demoDir = resolve(import.meta.dirname, "../../../apps/web/public/media/demo");
const entries = loadLibrary(root);
const missing: string[] = [];
for (const { block, referencePath } of entries) {
  for (const slot of block.slots.filter(isMediaSlot)) {
    const file = block.demo[slot.key];
    if (file && !existsSync(join(demoDir, file))) missing.push(`${block.slug}: demo file ${file} not in ${demoDir}`);
  }
  for (const target of TARGETS.filter((t) => block.targets.includes(t))) {
    compile({ title: block.name, target, blocks: [block] });
  }
  console.log(`ok  ${block.category.padEnd(10)} ${block.slug}${referencePath ? "" : "  (no reference.html)"}`);
}
if (missing.length) {
  console.error(missing.join("\n"));
  process.exit(1);
}
console.log(`${entries.length} blocks valid`);
