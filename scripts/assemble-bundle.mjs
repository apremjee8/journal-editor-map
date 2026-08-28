#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARTS = join(ROOT, "data/bundle-parts");

const meta = JSON.parse(await readFile(join(PARTS, "meta.json"), "utf8"));
const files = (await readdir(PARTS)).filter((f) => f.endsWith(".json") && f !== "meta.json");
const byId = {};
for (const file of files) {
  const row = JSON.parse(await readFile(join(PARTS, file), "utf8"));
  byId[row.journal.id] = row;
}
const order = [
  "jama",
  "jama-im",
  "nejm",
  "jacc",
  "circulation",
  "jama-cardio",
  "ehj",
  "ajrccm",
  "chest",
  "jco",
  "lancet-onc",
  "jama-onc",
];
const journals = order.map((id) => {
  if (!byId[id]) throw new Error(`missing bundle part ${id}`);
  return byId[id];
});
const bundle = { ...meta, journals };
await writeFile(join(ROOT, "data/bundle.json"), JSON.stringify(bundle, null, 2) + "\n");
console.log(`wrote data/bundle.json journals=${journals.length}`);
