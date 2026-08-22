import { STORE_NAMES } from "../config.js";
import { createRepository } from "../storage/repositories.js";

const tripsRepository = createRepository(STORE_NAMES.trips);
const itemsRepository = createRepository(STORE_NAMES.masterItems);
const categoriesRepository = createRepository(STORE_NAMES.categories);

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function activeItems(items) {
  return items.filter((item) => !item.removed);
}

function setupIsComplete(trip) {
  const packing = activeItems(trip.packingItems);
  const preparation = activeItems(trip.preparationItems);
  return packing.every((item) => item.checked) && preparation.every((item) => item.checked);
}

export function isFlightItemActive(item, selectedOptionalItemIds = []) {
  if (!item.active || item.scope !== "flightCheck") return false;
  const condition = item.activationCondition;
  if (!condition) return true;
  if (condition.kind === "selectedEquipment") return new Set(selectedOptionalItemIds).has(condition.referencedMasterItemId);
  return false;
}

async function snapshotFlightItems(trip) {
  const [items, categories] = await Promise.all([itemsRepository.getAll(), categoriesRepository.getAll()]);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const selectedEquipment = new Set(trip.selectedOptionalItemIds ?? []);
  return items.filter((item) => isFlightItemActive(item, [...selectedEquipment]))
    .sort((a, b) => (categoryMap.get(a.categoryId)?.sortOrder ?? 9999) - (categoryMap.get(b.categoryId)?.sortOrder ?? 9999) || a.sortOrder - b.sortOrder)
    .map((item) => {
      const category = categoryMap.get(item.categoryId);
      return {
        id: uuid(), sourceMasterItemId: item.id, sourceRevision: item.revision,
        title: item.title, description: item.description,
        categorySnapshot: category
          ? { id: category.id, name: category.name, sortOrder: category.sortOrder }
          : { id: item.categoryId, name: "Ukendt kategori", sortOrder: 9999 },
        activationConditionSnapshot: item.activationCondition ? { ...item.activationCondition } : null,
        sortOrder: item.sortOrder, completed: false, completedAt: null
      };
    });
}

export const flightCheckService = Object.freeze({
  async start(tripId) {
    const trip = await tripsRepository.get(tripId);
    if (!trip || trip.status !== "active") throw new Error("Den aktive tur kunne ikke findes.");
    if ((trip.flightChecks ?? []).some((check) => check.status === "inProgress")) {
      throw new Error("Der er allerede et igangværende Flight Check.");
    }
    const items = await snapshotFlightItems(trip);
    if (!items.length) throw new Error("Der er ingen aktive Flight Check-punkter.");
    const timestamp = now();
    const flightCheck = {
      id: uuid(), tripId, sequenceNumber: (trip.flightChecks?.length ?? 0) + 1,
      status: "inProgress", startedAt: timestamp, completedAt: null,
      items, completedItemCount: 0, totalItemCount: items.length
    };
    const updated = {
      ...trip, flightChecks: [...(trip.flightChecks ?? []), flightCheck],
      updatedAt: timestamp, revision: trip.revision + 1
    };
    await tripsRepository.put(updated);
    return updated;
  },

  async updateItem(tripId, flightCheckId, itemId, completed) {
    const trip = await tripsRepository.get(tripId);
    if (!trip || trip.status !== "active") throw new Error("Den aktive tur kunne ikke findes.");
    let checkFound = false;
    let itemFound = false;
    const timestamp = now();
    const flightChecks = trip.flightChecks.map((check) => {
      if (check.id !== flightCheckId) return check;
      checkFound = true;
      if (check.status !== "inProgress") throw new Error("Et gennemført Flight Check er låst.");
      const items = check.items.map((item) => {
        if (item.id !== itemId) return item;
        itemFound = true;
        return { ...item, completed, completedAt: completed ? (item.completedAt ?? timestamp) : null };
      });
      return { ...check, items, completedItemCount: items.filter((item) => item.completed).length };
    });
    if (!checkFound || !itemFound) throw new Error("Flight Check-punktet findes ikke længere.");
    const updated = { ...trip, flightChecks, updatedAt: timestamp, revision: trip.revision + 1 };
    await tripsRepository.put(updated);
    return updated;
  },

  async complete(tripId, flightCheckId, { allowIncompleteSetup = false } = {}) {
    const trip = await tripsRepository.get(tripId);
    if (!trip || trip.status !== "active") throw new Error("Den aktive tur kunne ikke findes.");
    const check = trip.flightChecks.find((entry) => entry.id === flightCheckId);
    if (!check) throw new Error("Flight Checket kunne ikke findes.");
    if (check.status !== "inProgress") throw new Error("Flight Checket er allerede gennemført og låst.");
    if (!check.items.length || !check.items.every((item) => item.completed)) {
      throw new Error("Alle aktive Flight Check-punkter skal være udført.");
    }
    const isFirstDeparture = !(trip.initialDepartureAt);
    if (isFirstDeparture && !setupIsComplete(trip) && !allowIncompleteSetup) {
      const error = new Error("Pakning eller Klargøring er ikke fuldført. Bekræft, at du vil afslutte dem med den nuværende status.");
      error.code = "INCOMPLETE_SETUP";
      throw error;
    }
    const timestamp = now();
    const flightChecks = trip.flightChecks.map((entry) => entry.id === flightCheckId ? {
      ...entry, status: "completed", completedAt: timestamp,
      completedItemCount: entry.items.length, totalItemCount: entry.items.length
    } : entry);
    const updated = {
      ...trip, flightChecks,
      initialDepartureAt: trip.initialDepartureAt ?? timestamp,
      packingClosedAt: trip.packingClosedAt ?? (isFirstDeparture ? timestamp : null),
      preparationClosedAt: trip.preparationClosedAt ?? (isFirstDeparture ? timestamp : null),
      updatedAt: timestamp, revision: trip.revision + 1
    };
    await tripsRepository.put(updated);
    return updated;
  }
});
