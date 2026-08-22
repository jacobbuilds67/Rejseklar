import { STORE_NAMES } from "../config.js";
import { createRepository } from "../storage/repositories.js";
import { runTransaction } from "../storage/database.js";
import { calculateQuantity } from "./quantity-calculator.js";
import { normalizeNonNegativeQuantity, validateIsoDate } from "./validation.js";

const settingsRepository = createRepository(STORE_NAMES.settings);
const tripsRepository = createRepository(STORE_NAMES.trips);
const peopleRepository = createRepository(STORE_NAMES.people);
const itemsRepository = createRepository(STORE_NAMES.masterItems);
const categoriesRepository = createRepository(STORE_NAMES.categories);
const rulesRepository = createRepository(STORE_NAMES.packingRules);

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function requireTripName(value) {
  const name = String(value ?? "").trim();
  if (!name) throw new Error("Turnavn skal udfyldes.");
  return name;
}

function requireDepartureDate(value) {
  return validateIsoDate(value, "Afrejsedato");
}

function requireDuration(value) {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 1 || duration > 366) throw new Error("Antal dage skal være mellem 1 og 366.");
  return duration;
}

function snapshotCategory(category) {
  return { id: category.id, name: category.name, sortOrder: category.sortOrder };
}

function snapshotPerson(person) {
  return person ? { id: person.id, name: person.name } : null;
}

function itemQuantity(item, rule, tripInput) {
  if (item.quantityMode === "none") return null;
  if (item.quantityMode === "manual") return 1;
  if (item.quantityMode === "fixed") return Math.max(0, Number(item.fixedQuantity) || 0);
  if (item.quantityMode === "rule" && rule) {
    return calculateQuantity(rule, { days: tripInput.durationDays, selectedPeople: tripInput.participantIds.length });
  }
  return 1;
}

export async function buildPackingSnapshot(input) {
  const [items, categories, rules, people] = await Promise.all([
    itemsRepository.getAll(), categoriesRepository.getAll(), rulesRepository.getAll(), peopleRepository.getAll()
  ]);
  const categoryMap = new Map(categories.map((entry) => [entry.id, entry]));
  const ruleMap = new Map(rules.map((entry) => [entry.id, entry]));
  const peopleMap = new Map(people.map((entry) => [entry.id, entry]));
  const participants = input.participantIds.map((id) => peopleMap.get(id)).filter(Boolean);
  const participantSet = new Set(participants.map((person) => person.id));
  const optionalSet = new Set(input.selectedOptionalItemIds);

  const included = items.filter((item) => {
    if (!item.active || item.scope !== "packing") return false;
    if (item.inclusionType === "personal") return participantSet.has(item.personId);
    if (item.inclusionType === "optional") return optionalSet.has(item.id);
    return true;
  });

  return {
    participantSnapshots: participants.map(snapshotPerson),
    packingItems: included.map((item) => {
      const category = categoryMap.get(item.categoryId);
      const person = peopleMap.get(item.personId);
      const rule = ruleMap.get(item.packingRuleId);
      return {
        id: uuid(), sourceMasterItemId: item.id, sourceRevision: item.revision,
        scope: "packing", title: item.title, description: item.description,
        categorySnapshot: category ? snapshotCategory(category) : { id: item.categoryId, name: "Ukendt kategori", sortOrder: 9999 },
        personSnapshot: snapshotPerson(person), quantityMode: item.quantityMode,
        ruleSnapshot: rule ? { ...rule } : null, quantity: itemQuantity(item, rule, input), unit: item.unit,
        checked: false, checkedAt: null, sortOrder: item.sortOrder, addedForTrip: false, removed: false
      };
    })
  };
}

export const tripService = Object.freeze({
  async getActiveTrip() {
    const settings = await settingsRepository.get("app");
    return settings?.activeTripId ? tripsRepository.get(settings.activeTripId) : null;
  },

  getTrip(id) {
    return tripsRepository.get(id);
  },

  async listCompletedTrips() {
    return (await tripsRepository.getAll())
      .filter((trip) => trip.status === "completed")
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
  },

  async getOptions() {
    const [people, items, categories] = await Promise.all([
      peopleRepository.getAll(), itemsRepository.getAll(), categoriesRepository.getAll()
    ]);
    const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
    return {
      people: people.filter((person) => person.active).sort((a, b) => a.name.localeCompare(b.name, "da")),
      optionalItems: items.filter((item) => item.active && item.scope === "packing" && item.inclusionType === "optional")
        .sort((a, b) => (categoryMap.get(a.categoryId) ?? "").localeCompare(categoryMap.get(b.categoryId) ?? "", "da") || a.sortOrder - b.sortOrder)
        .map((item) => ({ ...item, categoryName: categoryMap.get(item.categoryId) ?? "Ukendt kategori" }))
    };
  },

  async createTrip(input) {
    const settings = await settingsRepository.get("app");
    if (settings?.activeTripId) throw new Error("Afslut den aktive tur, før du opretter en ny.");
    const normalized = {
      name: requireTripName(input.name), departureDate: requireDepartureDate(input.departureDate),
      durationDays: requireDuration(input.durationDays),
      participantIds: [...new Set(input.participantIds ?? [])],
      selectedOptionalItemIds: [...new Set(input.selectedOptionalItemIds ?? [])]
    };
    const snapshots = await buildPackingSnapshot(normalized);
    const timestamp = now();
    const trip = {
      id: uuid(), name: normalized.name, departureDate: normalized.departureDate, durationDays: normalized.durationDays,
      status: "active", participantSnapshots: snapshots.participantSnapshots,
      selectedOptionalItemIds: normalized.selectedOptionalItemIds, packingItems: snapshots.packingItems,
      preparationItems: [], preparationSnapshotCreatedAt: null, flightChecks: [], packingCompletedAt: null, preparationCompletedAt: null,
      createdAt: timestamp, updatedAt: timestamp, completedAt: null, revision: 1
    };
    await runTransaction([STORE_NAMES.settings, STORE_NAMES.trips], "readwrite", (transaction) => {
      transaction.objectStore(STORE_NAMES.trips).put(trip);
      transaction.objectStore(STORE_NAMES.settings).put({ ...settings, activeTripId: trip.id, updatedAt: timestamp });
    });
    return trip;
  },

  async updateDetails(tripId, input) {
    const trip = await tripsRepository.get(tripId);
    if (!trip || trip.status !== "active") throw new Error("Den aktive tur kunne ikke findes.");
    const durationDays = requireDuration(input.durationDays);
    if (trip.initialDepartureAt && durationDays !== trip.durationDays) throw new Error("Antal dage kan ikke ændres efter første afgang.");
    const packingItems = trip.packingItems.map((item) => {
      if (durationDays === trip.durationDays || item.quantityMode !== "rule" || !item.ruleSnapshot) return item;
      return { ...item, quantity: calculateQuantity(item.ruleSnapshot, { days: durationDays, selectedPeople: trip.participantSnapshots.length }) };
    });
    const updated = {
      ...trip, name: requireTripName(input.name), departureDate: requireDepartureDate(input.departureDate),
      durationDays, packingItems, updatedAt: now(), revision: trip.revision + 1
    };
    await tripsRepository.put(updated);
    return updated;
  },

  async updatePackingItem(tripId, itemId, changes) {
    const trip = await tripsRepository.get(tripId);
    if (!trip || trip.status !== "active") throw new Error("Den aktive tur kunne ikke findes.");
    if (trip.packingClosedAt) throw new Error("Pakningen er afsluttet og kan ikke længere ændres.");
    let found = false;
    const timestamp = now();
    const packingItems = trip.packingItems.map((item) => {
      if (item.id !== itemId) return item;
      found = true;
      const checked = changes.checked ?? item.checked;
      return {
        ...item,
        quantity: changes.quantity === undefined ? item.quantity : Math.max(0, Number(changes.quantity) || 0),
        checked, checkedAt: checked ? (item.checkedAt ?? timestamp) : null,
        removed: changes.removed ?? item.removed
      };
    });
    if (!found) throw new Error("Punktet findes ikke længere på turen.");
    const updated = { ...trip, packingItems, updatedAt: timestamp, revision: trip.revision + 1 };
    await tripsRepository.put(updated);
    return updated;
  },

  async addPackingItem(tripId, input) {
    const trip = await tripsRepository.get(tripId);
    if (!trip || trip.status !== "active") throw new Error("Den aktive tur kunne ikke findes.");
    if (trip.packingClosedAt) throw new Error("Pakningen er afsluttet og kan ikke længere ændres.");
    const title = String(input.title ?? "").trim();
    if (!title) throw new Error("Punktets navn skal udfyldes.");
    const item = {
      id: uuid(), sourceMasterItemId: null, sourceRevision: null, scope: "packing", title, description: "",
      categorySnapshot: { id: null, name: String(input.categoryName || "Tilføjet til turen"), sortOrder: 9998 },
      personSnapshot: null, quantityMode: "manual", ruleSnapshot: null,
      quantity: normalizeNonNegativeQuantity(input.quantity), unit: "stk.", checked: false, checkedAt: null,
      sortOrder: trip.packingItems.length + 1, addedForTrip: true, removed: false
    };
    const updated = { ...trip, packingItems: [...trip.packingItems, item], updatedAt: now(), revision: trip.revision + 1 };
    await tripsRepository.put(updated);
    return updated;
  },

  async completeTrip(tripId) {
    const [trip, settings] = await Promise.all([tripsRepository.get(tripId), settingsRepository.get("app")]);
    if (!trip || trip.status !== "active") throw new Error("Den aktive tur kunne ikke findes.");
    if (!(trip.flightChecks ?? []).some((check) => check.status === "completed")) {
      throw new Error("Turen kan først afsluttes efter mindst ét gennemført Flight Check.");
    }
    const timestamp = now();
    const completed = { ...trip, status: "completed", completedAt: timestamp, updatedAt: timestamp, revision: trip.revision + 1 };
    await runTransaction([STORE_NAMES.settings, STORE_NAMES.trips], "readwrite", (transaction) => {
      transaction.objectStore(STORE_NAMES.trips).put(completed);
      transaction.objectStore(STORE_NAMES.settings).put({
        ...settings, activeTripId: settings.activeTripId === tripId ? null : settings.activeTripId, updatedAt: timestamp
      });
    });
    return completed;
  }
});
