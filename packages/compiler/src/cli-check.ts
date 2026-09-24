import { resolve } from "node:path";
import { loadLibrary } from "./node";
import { compile, TARGETS } from "./index";

const root = resolve(import.meta.dirname, "../../../library");
const entries = loadLibrary(root);
for (const { block, referencePath } of entries) {
  for (const target of TARGETS.filter((t) => block.targets.includes(t))) {
    compile({ title: block.name, target, blocks: [block] });
  }
  console.log(`ok  ${block.category.padEnd(10)} ${block.slug}${referencePath ? "" : "  (no reference.html)"}`);
}
console.log(`${entries.length} blocks valid`);
