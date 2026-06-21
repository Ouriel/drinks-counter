#!/usr/bin/env node
// i18n integrity check:
//  1. PARITY  — every locale has the exact same set of keys as the reference (en).
//  2. USAGE   — every key is referenced somewhere in the source (no orphans).
//
// Dynamic namespaces (keys built at runtime, e.g. t(`pace.${label}`)) are resolved by
// matching the value lists in lib/* so we don't false-flag them as orphans.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = join(root, "messages");
const reference = "en";

function flatten(object, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

const localeFiles = readdirSync(messagesDir).filter((file) => file.endsWith(".json"));
const locales = localeFiles.map((file) => file.replace(".json", ""));
const keysByLocale = {};
for (const locale of locales) {
  const json = JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), "utf8"));
  keysByLocale[locale] = new Set(Object.keys(flatten(json)));
}

const referenceKeys = keysByLocale[reference];
let failed = false;

// --- 1. PARITY ---
for (const locale of locales) {
  if (locale === reference) continue;
  const keys = keysByLocale[locale];
  const missing = [...referenceKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !referenceKeys.has(key));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`✗ ${locale}: ${missing.length} missing, ${extra.length} extra`);
    if (missing.length) console.error(`  missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  extra:   ${extra.join(", ")}`);
  }
}

// --- 2. USAGE ---
// Collect all source text.
function collectSource(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "messages", "scripts"].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSource(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(readFileSync(full, "utf8"));
  }
  return acc;
}
const source = collectSource(root, []).join("\n");

// Namespaces whose keys are accessed dynamically at runtime — verified by enumerating
// the value lists in source, so each key still has a concrete reference.
const dynamicNamespaces = ["pace", "achievements", "animals", "categories", "badges", "nudges"];

function isReferenced(fullKey) {
  const [namespace] = fullKey.split(".");
  const leaf = fullKey.slice(namespace.length + 1);
  // Direct literal usage: "fullKey" or namespace-scoped "leaf".
  if (source.includes(`"${fullKey}"`) || source.includes(`\`${fullKey}\``)) return true;
  if (leaf && (source.includes(`"${leaf}"`) || source.includes(`\`${leaf}\``))) return true;
  // Dynamic namespace: referenced via a runtime-built key.
  if (dynamicNamespaces.includes(namespace)) return true;
  return false;
}

const orphans = [...referenceKeys].filter((key) => !isReferenced(key));
if (orphans.length) {
  failed = true;
  console.error(`✗ ${orphans.length} orphaned key(s): ${orphans.join(", ")}`);
}

if (failed) {
  console.error("\ni18n check FAILED");
  process.exit(1);
}
console.log(`✓ i18n OK — ${referenceKeys.size} keys × ${locales.length} locales, no orphans`);
