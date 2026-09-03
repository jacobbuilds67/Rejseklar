import test from "node:test";
import assert from "node:assert/strict";
import { SCHEMA_VERSION, STORE_NAMES } from "../src/config.js";
import { initialCategories, initialMasterItems, initialPackingRules, initialPersonItemTemplates, seedSummary } from "../src/data/initial-master-data.js";
import { calculateQuantity } from "../src/domain/quantity-calculator.js";
import { normalizeNonNegativeQuantity, validateIsoDate, validatePackingRule } from "../src/domain/validation.js";
import { escapeHtml } from "../src/ui/html.js";
import { isFlightItemActive } from "../src/domain/flight-check-service.js";
import { BACKUP_FORMAT, BACKUP_VERSION, validateBackupStructure } from "../src/backup/backup-service.js";
import { retireTentItemsFromActiveTrip, SEED_DATA_VERSION } from "../src/data/seed-service.js";
import { access, readFile } from "node:fs/promises";

test("database schema contains the approved master and history stores", () => {
  assert.equal(SCHEMA_VERSION, 1);
  assert.deepEqual(Object.keys(STORE_NAMES), [
    "settings", "people", "categories", "packingRules", "personItemTemplates", "masterItems", "trips"
  ]);
  assert.equal(new Set(Object.values(STORE_NAMES)).size, Object.values(STORE_NAMES).length);
});

test("all 102 PDF entries are represented exactly once", () => {
  assert.equal(seedSummary.pdfPackingItems, 72);
  assert.equal(seedSummary.pdfPersonTemplates, 12);
  assert.equal(seedSummary.pdfFlightItems, 18);
  assert.equal(seedSummary.pdfPackingItems + seedSummary.pdfPersonTemplates + seedSummary.pdfFlightItems, 102);
  assert.equal(seedSummary.preparationItems, 10);
  assert.equal(initialMasterItems.length, 101);
  assert.equal(initialPersonItemTemplates.length, 12);
  assert.equal(initialCategories.length, 16);
  assert.equal(initialPackingRules.length, 8);
  assert.equal(SEED_DATA_VERSION, 3);
  const sourceRecords = [...initialMasterItems, ...initialPersonItemTemplates]
    .filter((item) => item.sourceReference?.startsWith("Checkliste"));
  assert.equal(new Set(sourceRecords.map((item) => item.sourceReference)).size, 102);
  const cycles = initialMasterItems.find((item) => item.id === "equipment-cycles");
  assert.equal(cycles?.inclusionType, "optional");
  assert.ok(initialMasterItems.filter((item) => ["pdf-93", "pdf-94"].includes(item.id))
    .every((item) => item.activationCondition?.referencedMasterItemId === cycles.id));
  assert.ok(initialMasterItems.filter((item) => ["pdf-79", "pdf-80", "pdf-81", "pdf-82", "pdf-83", "pdf-84", "pdf-87"].includes(item.id))
    .every((item) => item.active === false));
});

test("trip inputs preserve zero quantities and reject impossible dates", () => {
  assert.equal(normalizeNonNegativeQuantity("0"), 0);
  assert.equal(normalizeNonNegativeQuantity("3"), 3);
  assert.equal(normalizeNonNegativeQuantity(""), 1);
  assert.equal(validateIsoDate("2026-08-21", "Afrejsedato"), "2026-08-21");
  assert.throws(() => validateIsoDate("2026-02-30", "Afrejsedato"), /gyldig dato/);
  assert.throws(() => validateIsoDate("2026-13-01", "Afrejsedato"), /gyldig dato/);
});

test("masterdata migration tolerates legacy trips and preserves locked snapshots", () => {
  const legacy = { id: "legacy", status: "active" };
  assert.equal(retireTentItemsFromActiveTrip(legacy), legacy);
  const completed = { id: "old", status: "completed", packingItems: [{ sourceMasterItemId: "pdf-79", removed: false }] };
  assert.equal(retireTentItemsFromActiveTrip(completed), completed);
  const active = { id: "new", status: "active", packingItems: [{ sourceMasterItemId: "pdf-79", removed: false }, { sourceMasterItemId: "pdf-1", removed: false }] };
  const migrated = retireTentItemsFromActiveTrip(active);
  assert.equal(migrated.packingItems[0].removed, true);
  assert.equal(migrated.packingItems[1].removed, false);
});

test("user-authored trip content is escaped before rendering", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("approved quantity rules calculate understandable whole-number amounts", () => {
  assert.equal(calculateQuantity({ kind: "fixed", value: 2 }, { days: 9 }), 2);
  assert.equal(calculateQuantity({ kind: "perDay", value: 1 }, { days: 9 }), 9);
  assert.equal(calculateQuantity({ kind: "perPeriod", value: 4 }, { days: 9 }), 3);
  assert.equal(calculateQuantity({ kind: "daysPlus", extra: 1 }, { days: 9 }), 10);
  assert.equal(calculateQuantity({ kind: "perSelectedPerson" }, { selectedPeople: 4 }), 4);
  assert.equal(calculateQuantity({ kind: "manual" }, { days: 9 }), null);
});

test("a per-period rule rejects a zero-day period", () => {
  assert.throws(() => validatePackingRule({ name: "Ugyldig", kind: "perPeriod", value: 0 }), /større end nul/);
});

test("conditional Flight Check items follow selected equipment", () => {
  const conditional = { active: true, scope: "flightCheck", activationCondition: { kind: "selectedEquipment", referencedMasterItemId: "cycles" } };
  assert.equal(isFlightItemActive(conditional, []), false);
  assert.equal(isFlightItemActive(conditional, ["cycles"]), true);
  assert.equal(isFlightItemActive({ active: true, scope: "flightCheck", activationCondition: null }, []), true);
  assert.equal(isFlightItemActive({ active: false, scope: "flightCheck", activationCondition: null }, []), false);
});

test("backup structure accepts complete referenced data and rejects incompatible versions", () => {
  const backup = {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    payload: {
      [STORE_NAMES.settings]: [{ id: "app", activeTripId: null }],
      [STORE_NAMES.people]: [],
      [STORE_NAMES.categories]: structuredClone(initialCategories),
      [STORE_NAMES.packingRules]: structuredClone(initialPackingRules),
      [STORE_NAMES.personItemTemplates]: structuredClone(initialPersonItemTemplates),
      [STORE_NAMES.masterItems]: structuredClone(initialMasterItems),
      [STORE_NAMES.trips]: []
    }
  };
  const summary = validateBackupStructure(backup);
  assert.equal(summary.masterItems, 101);
  assert.equal(summary.completedTrips, 0);
  assert.throws(() => validateBackupStructure({ ...backup, backupVersion: 999 }), /understøttes ikke/);
});

test("PWA manifest and offline app shell reference existing install assets", async () => {
  const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));
  const serviceWorker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
  const shellPaths = [...serviceWorker.matchAll(/^\s+"\.\/(.+)",?$/gm)].map((match) => match[1]);
  assert.ok(shellPaths.length >= 25);
  await Promise.all(shellPaths.map((path) => access(new URL(`../${path}`, import.meta.url))));
});
