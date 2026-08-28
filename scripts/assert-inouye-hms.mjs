#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const part = JSON.parse(await readFile(join(ROOT, "data/bundle-parts/jama-im.json"), "utf8"));
const editors = JSON.parse(await readFile(join(ROOT, "data/editors.json"), "utf8"));
const inst = JSON.parse(await readFile(join(ROOT, "data/institutions.json"), "utf8"));

const errors = [];
const inouye = editors.byJournal["jama-im"].find((e) => e.name === "Sharon K. Inouye");
if (!inouye) errors.push("Inouye missing from editors.json");
if (inouye?.institutionGroupId !== "harvard-hms") {
  errors.push(`Inouye group is ${inouye?.institutionGroupId}, expected harvard-hms`);
}
if (inouye?.startYear !== 2023) errors.push("Inouye startYear must stay 2023");
if (inouye?.gapReason) errors.push("Inouye still has a gapReason");
if (!inouye?.sources?.some((s) => s.url?.startsWith("http"))) {
  errors.push("Inouye missing source URL");
}

const group = inst.groups.find((g) => g.id === "harvard-hms");
const ids = (group?.members || []).map((m) => m.members ? null : m.openAlexId);
if (!group || group.label !== "HMS / Harvard") errors.push("harvard-hms label must be HMS / Harvard");
if (!ids.includes("I136199984")) errors.push("harvard-hms must include I136199984");
if (ids.includes("I1283280774")) errors.push("harvard-hms must not include Brigham");
if (ids.includes("I4210123879")) errors.push("harvard-hms must not include Hebrew SeniorLife");

const y23 = part.series.find((p) => p.year === 2023)?.byInstitution["harvard-hms"];
const y24 = part.series.find((p) => p.year === 2024)?.byInstitution["harvard-hms"];
if (!y23?.articles) errors.push(`2023 Harvard JAMA IM articles=${y23?.articles}`);
if (!y24?.articles) errors.push(`2024 Harvard JAMA IM articles=${y24?.articles}`);

const partInouye = part.editors.find((e) => e.name === "Sharon K. Inouye");
if (partInouye?.institutionGroupId !== "harvard-hms") {
  errors.push("jama-im part still points Inouye elsewhere");
}
if (partInouye?.gapReason) errors.push("jama-im part still has Inouye gapReason");

if (errors.length) {
  console.error("FAIL");
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`PASS Inouye harvard-hms I136199984 2023=${y23.articles} 2024=${y24.articles}`);
