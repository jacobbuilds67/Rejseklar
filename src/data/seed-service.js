import { STORE_NAMES } from "../config.js";
import { runTransaction } from "../storage/database.js";
import { initialCategories, initialMasterItems, initialPackingRules, initialPersonItemTemplates } from "./initial-master-data.js";

export const SEED_DATA_VERSION = 3;

const VERSION_3_RETIRED_ITEM_IDS = ["pdf-79", "pdf-80", "pdf-81", "pdf-82", "pdf-83", "pdf-84", "pdf-87"];
const VERSION_3_RETIRED_PACKING_IDS = new Set(VERSION_3_RETIRED_ITEM_IDS.filter((id) => id !== "pdf-87"));

export function retireTentItemsFromActiveTrip(trip) {
  if (trip?.status !== "active" || trip.packingClosedAt || !Array.isArray(trip.packingItems)) return trip;
  let changed = false;
  const packingItems = trip.packingItems.map((item) => {
    if (!VERSION_3_RETIRED_PACKING_IDS.has(item.sourceMasterItemId) || item.removed) return item;
    changed = true;
    return { ...item, removed: true };
  });
  if (!changed) return trip;
  return { ...trip, packingItems };
}

function migrateVersion2(masterStore) {
  const cycles = initialMasterItems.find((item) => item.id === "equipment-cycles");
  const addCycles = masterStore.get(cycles.id);
  addCycles.onsuccess = () => {
    if (!addCycles.result) masterStore.put(cycles);
  };
  ["pdf-93", "pdf-94"].forEach((id) => {
    const request = masterStore.get(id);
    request.onsuccess = () => {
      const item = request.result;
      if (item?.activationCondition?.referencedMasterItemId === "pdf-47") {
        masterStore.put({
          ...item,
          activationCondition: { kind: "selectedEquipment", referencedMasterItemId: cycles.id },
          updatedAt: new Date().toISOString(),
          revision: (item.revision ?? 0) + 1
        });
      }
    };
  });
}

function migrateVersion3(masterStore, tripsStore) {
  VERSION_3_RETIRED_ITEM_IDS.forEach((id) => {
    const request = masterStore.get(id);
    request.onsuccess = () => {
      const item = request.result;
      if (item?.active !== false) {
        masterStore.put({
          ...item,
          active: false,
          updatedAt: new Date().toISOString(),
          revision: (item.revision ?? 0) + 1
        });
      }
    };
  });
  const tripsRequest = tripsStore.getAll();
  tripsRequest.onsuccess = () => {
    tripsRequest.result.forEach((trip) => {
      const migrated = retireTentItemsFromActiveTrip(trip);
      if (migrated !== trip) tripsStore.put({
        ...migrated,
        updatedAt: new Date().toISOString(),
        revision: (trip.revision ?? 0) + 1
      });
    });
  };
}

export async function seedInitialData(settingsRecord) {
  if ((settingsRecord.seedDataVersion ?? 0) >= SEED_DATA_VERSION) return false;

  const storeNames = [STORE_NAMES.settings, STORE_NAMES.categories, STORE_NAMES.packingRules, STORE_NAMES.personItemTemplates, STORE_NAMES.masterItems, STORE_NAMES.trips];
  await runTransaction(storeNames, "readwrite", (transaction) => {
    const addAll = (storeName, records) => records.forEach((item) => transaction.objectStore(storeName).put(item));
    if ((settingsRecord.seedDataVersion ?? 0) === 0) {
      addAll(STORE_NAMES.categories, initialCategories);
      addAll(STORE_NAMES.packingRules, initialPackingRules);
      addAll(STORE_NAMES.personItemTemplates, initialPersonItemTemplates);
      addAll(STORE_NAMES.masterItems, initialMasterItems);
    } else {
      const masterStore = transaction.objectStore(STORE_NAMES.masterItems);
      if ((settingsRecord.seedDataVersion ?? 0) < 2) migrateVersion2(masterStore);
      if ((settingsRecord.seedDataVersion ?? 0) < 3) migrateVersion3(masterStore, transaction.objectStore(STORE_NAMES.trips));
    }
    transaction.objectStore(STORE_NAMES.settings).put({
      ...settingsRecord,
      seedDataVersion: SEED_DATA_VERSION,
      updatedAt: new Date().toISOString()
    });
  });
  return true;
}
