import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { BACKUP_FORMAT, BACKUP_VERSION, APP_VERSION } from "../src/backup/backup-service.js";
import { SCHEMA_VERSION, STORE_NAMES } from "../src/config.js";
import { initialCategories, initialMasterItems, initialPackingRules, initialPersonItemTemplates } from "../src/data/initial-master-data.js";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Angiv en outputfil.");

const timestamp = new Date().toISOString();
const payload = {
  [STORE_NAMES.settings]: [{ id: "app", schemaVersion: SCHEMA_VERSION, seedDataVersion: 1, activeTripId: null, locale: "da-DK", createdAt: timestamp, updatedAt: timestamp }],
  [STORE_NAMES.people]: [{ id: "fixture-person", name: "Gendannet testperson", active: true, sortOrder: 10, revision: 1, createdAt: timestamp, updatedAt: timestamp }],
  [STORE_NAMES.categories]: initialCategories,
  [STORE_NAMES.packingRules]: initialPackingRules,
  [STORE_NAMES.personItemTemplates]: initialPersonItemTemplates,
  [STORE_NAMES.masterItems]: initialMasterItems,
  [STORE_NAMES.trips]: []
};
const backup = {
  format: BACKUP_FORMAT,
  backupVersion: BACKUP_VERSION,
  schemaVersion: SCHEMA_VERSION,
  appVersion: APP_VERSION,
  exportedAt: timestamp,
  checksum: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  payload
};

await writeFile(outputPath, JSON.stringify(backup, null, 2), "utf8");
