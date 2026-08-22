import { STORE_NAMES } from "../config.js";
import { runTransaction } from "../storage/database.js";
import { initialCategories, initialMasterItems, initialPackingRules, initialPersonItemTemplates } from "./initial-master-data.js";

export const SEED_DATA_VERSION = 2;

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

export async function seedInitialData(settingsRecord) {
  if ((settingsRecord.seedDataVersion ?? 0) >= SEED_DATA_VERSION) return false;

  const storeNames = [STORE_NAMES.settings, STORE_NAMES.categories, STORE_NAMES.packingRules, STORE_NAMES.personItemTemplates, STORE_NAMES.masterItems];
  await runTransaction(storeNames, "readwrite", (transaction) => {
    const addAll = (storeName, records) => records.forEach((item) => transaction.objectStore(storeName).put(item));
    if ((settingsRecord.seedDataVersion ?? 0) === 0) {
      addAll(STORE_NAMES.categories, initialCategories);
      addAll(STORE_NAMES.packingRules, initialPackingRules);
      addAll(STORE_NAMES.personItemTemplates, initialPersonItemTemplates);
      addAll(STORE_NAMES.masterItems, initialMasterItems);
    } else if ((settingsRecord.seedDataVersion ?? 0) < 2) {
      migrateVersion2(transaction.objectStore(STORE_NAMES.masterItems));
    }
    transaction.objectStore(STORE_NAMES.settings).put({
      ...settingsRecord,
      seedDataVersion: SEED_DATA_VERSION,
      updatedAt: new Date().toISOString()
    });
  });
  return true;
}
