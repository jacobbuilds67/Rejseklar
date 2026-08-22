import { runTransaction } from "./database.js";

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createRepository(storeName) {
  return Object.freeze({
    async get(id) {
      let pending;
      await runTransaction([storeName], "readonly", (transaction) => {
        pending = requestResult(transaction.objectStore(storeName).get(id));
      });
      return pending;
    },
    async getAll() {
      let pending;
      await runTransaction([storeName], "readonly", (transaction) => {
        pending = requestResult(transaction.objectStore(storeName).getAll());
      });
      return pending;
    },
    put(record) {
      return runTransaction([storeName], "readwrite", (transaction) => transaction.objectStore(storeName).put(record));
    },
    delete(id) {
      return runTransaction([storeName], "readwrite", (transaction) => transaction.objectStore(storeName).delete(id));
    }
  });
}
