import { SCHEMA_VERSION, STORE_NAMES } from "../config.js";
import { createRepository } from "../storage/repositories.js";
import { runTransaction } from "../storage/database.js";

export const BACKUP_FORMAT = "rejseklar-backup";
export const BACKUP_VERSION = 1;
export const APP_VERSION = "1.0.0";

const storeNames = Object.values(STORE_NAMES);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateStoreRecords(storeName, records) {
  assert(Array.isArray(records), `Datastore '${storeName}' mangler eller er ugyldigt.`);
  const ids = new Set();
  records.forEach((record, index) => {
    assert(isObject(record), `Post ${index + 1} i '${storeName}' er ugyldig.`);
    assert(typeof record.id === "string" && record.id.length > 0, `En post i '${storeName}' mangler id.`);
    assert(!ids.has(record.id), `Datastore '${storeName}' indeholder et dubleret id.`);
    ids.add(record.id);
  });
  return ids;
}

function validateReferences(payload, idSets) {
  const categories = idSets[STORE_NAMES.categories];
  const rules = idSets[STORE_NAMES.packingRules];
  const people = idSets[STORE_NAMES.people];
  payload[STORE_NAMES.masterItems].forEach((item) => {
    assert(["packing", "preparation", "flightCheck"].includes(item.scope), `Punktet '${item.id}' har et ugyldigt område.`);
    assert(categories.has(item.categoryId), `Punktet '${item.id}' henviser til en ukendt kategori.`);
    if (item.packingRuleId) assert(rules.has(item.packingRuleId), `Punktet '${item.id}' henviser til en ukendt pakkeregel.`);
    if (item.personId) assert(people.has(item.personId), `Punktet '${item.id}' henviser til en ukendt person.`);
    if (item.activationCondition?.kind === "selectedEquipment") {
      assert(idSets[STORE_NAMES.masterItems].has(item.activationCondition.referencedMasterItemId), `Punktet '${item.id}' henviser til ukendt valgfrit udstyr.`);
    }
  });
  payload[STORE_NAMES.personItemTemplates].forEach((item) => {
    assert(categories.has(item.categoryId), `Personskabelonen '${item.id}' henviser til en ukendt kategori.`);
    assert(rules.has(item.packingRuleId), `Personskabelonen '${item.id}' henviser til en ukendt pakkeregel.`);
  });
}

function validateTrips(payload, idSets) {
  const trips = payload[STORE_NAMES.trips];
  trips.forEach((trip) => {
    assert(typeof trip.name === "string" && trip.name.trim(), `Turen '${trip.id}' mangler navn.`);
    assert(["active", "completed"].includes(trip.status), `Turen '${trip.id}' har ugyldig status.`);
    assert(Number.isInteger(trip.durationDays) && trip.durationDays > 0, `Turen '${trip.id}' har ugyldigt antal dage.`);
    assert(Array.isArray(trip.participantSnapshots), `Turen '${trip.id}' mangler deltagersnapshots.`);
    assert(Array.isArray(trip.packingItems), `Turen '${trip.id}' mangler pakkesnapshot.`);
    assert(Array.isArray(trip.preparationItems), `Turen '${trip.id}' mangler klargøringssnapshot.`);
    assert(Array.isArray(trip.flightChecks), `Turen '${trip.id}' mangler Flight Check-data.`);
    trip.flightChecks.forEach((check) => {
      assert(["inProgress", "completed"].includes(check.status), `Et Flight Check på '${trip.name}' har ugyldig status.`);
      assert(Array.isArray(check.items) && check.items.length > 0, `Et Flight Check på '${trip.name}' mangler punkter.`);
      assert(check.totalItemCount === check.items.length, `Et Flight Check på '${trip.name}' har forkert totalantal.`);
      const completed = check.items.filter((item) => item.completed).length;
      assert(check.completedItemCount === completed, `Et Flight Check på '${trip.name}' har forkert gennemført antal.`);
      if (check.status === "completed") {
        assert(completed === check.items.length && Boolean(check.completedAt), `Et låst Flight Check på '${trip.name}' er ikke fuldstændigt.`);
      }
    });
  });
  const settings = payload[STORE_NAMES.settings].find((entry) => entry.id === "app");
  assert(settings, "Backup mangler appindstillinger.");
  if (settings.activeTripId) {
    assert(idSets[STORE_NAMES.trips].has(settings.activeTripId), "Den aktive tur findes ikke i backupfilen.");
    assert(trips.find((trip) => trip.id === settings.activeTripId)?.status === "active", "Den aktive tur har ugyldig status.");
  }
  assert(trips.filter((trip) => trip.status === "active").length <= 1, "Backup indeholder mere end én aktiv tur.");
}

export function validateBackupStructure(backup) {
  assert(isObject(backup), "Filen er ikke en gyldig Rejseklar-backup.");
  assert(backup.format === BACKUP_FORMAT, "Filen er ikke oprettet af Rejseklar.");
  assert(backup.backupVersion === BACKUP_VERSION, "Backupversionen understøttes ikke af denne appversion.");
  assert(backup.schemaVersion === SCHEMA_VERSION, "Dataversionen er ikke kompatibel med denne appversion.");
  assert(isObject(backup.payload), "Backupfilen mangler data.");
  const idSets = Object.fromEntries(storeNames.map((storeName) => [storeName, validateStoreRecords(storeName, backup.payload[storeName])]));
  validateReferences(backup.payload, idSets);
  validateTrips(backup.payload, idSets);
  return {
    people: backup.payload[STORE_NAMES.people].length,
    masterItems: backup.payload[STORE_NAMES.masterItems].length,
    activeTrips: backup.payload[STORE_NAMES.trips].filter((trip) => trip.status === "active").length,
    completedTrips: backup.payload[STORE_NAMES.trips].filter((trip) => trip.status === "completed").length,
    flightChecks: backup.payload[STORE_NAMES.trips].flatMap((trip) => trip.flightChecks).filter((check) => check.status === "completed").length
  };
}

export async function validateBackup(backup) {
  const summary = validateBackupStructure(backup);
  assert(typeof backup.checksum === "string" && backup.checksum.length === 64, "Backupfilens kontrolsum mangler.");
  const expected = await sha256(JSON.stringify(backup.payload));
  assert(expected === backup.checksum, "Backupfilens data er ændret eller beskadiget.");
  return summary;
}

export async function createBackup() {
  const payload = {};
  for (const [key, storeName] of Object.entries(STORE_NAMES)) {
    payload[storeName] = await createRepository(storeName).getAll();
  }
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    checksum: await sha256(JSON.stringify(payload)),
    payload
  };
}

export function backupFilename(prefix = "rejseklar-backup") {
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  return `${prefix}-${stamp}.json`;
}

export function downloadBackup(backup, filename = backupFilename()) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function restoreBackup(backup) {
  const summary = await validateBackup(backup);
  await runTransaction(storeNames, "readwrite", (transaction) => {
    storeNames.forEach((storeName) => {
      const store = transaction.objectStore(storeName);
      store.clear();
      backup.payload[storeName].forEach((record) => store.put(record));
    });
  });
  return summary;
}
