import { DATABASE_NAME, DATABASE_VERSION, STORE_NAMES } from "../config.js";

let databasePromise;

function upgradeDatabase(database) {
  Object.values(STORE_NAMES).forEach((storeName) => {
    if (!database.objectStoreNames.contains(storeName)) {
      database.createObjectStore(storeName, { keyPath: "id" });
    }
  });
}

export function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => upgradeDatabase(request.result);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(new Error("Den lokale database kunne ikke åbnes.", { cause: request.error }));
    request.onblocked = () => reject(new Error("Databaseopdateringen er blokeret af en anden åben fane."));
  });

  return databasePromise;
}

export async function runTransaction(storeNames, mode, operation) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode);
    let result;

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(new Error("Dataændringen kunne ikke gemmes.", { cause: transaction.error }));
    transaction.onabort = () => reject(new Error("Dataændringen blev afbrudt.", { cause: transaction.error }));

    try {
      result = operation(transaction);
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
}
