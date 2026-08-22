import { STORE_NAMES } from "../config.js";
import { createRepository } from "../storage/repositories.js";

const tripsRepository = createRepository(STORE_NAMES.trips);
const itemsRepository = createRepository(STORE_NAMES.masterItems);
const categoriesRepository = createRepository(STORE_NAMES.categories);

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

async function createSnapshotItems() {
  const [items, categories] = await Promise.all([itemsRepository.getAll(), categoriesRepository.getAll()]);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  return items.filter((item) => item.active && item.scope === "preparation")
    .sort((a, b) => (categoryMap.get(a.categoryId)?.sortOrder ?? 9999) - (categoryMap.get(b.categoryId)?.sortOrder ?? 9999) || a.sortOrder - b.sortOrder)
    .map((item) => {
      const category = categoryMap.get(item.categoryId);
      return {
        id: uuid(), sourceMasterItemId: item.id, sourceRevision: item.revision,
        title: item.title, description: item.description,
        categorySnapshot: category
          ? { id: category.id, name: category.name, sortOrder: category.sortOrder }
          : { id: item.categoryId, name: "Ukendt kategori", sortOrder: 9999 },
        sortOrder: item.sortOrder, checked: false, checkedAt: null, removed: false
      };
    });
}

function completionTimestamp(items, previousTimestamp) {
  const active = items.filter((item) => !item.removed);
  if (!active.length || !active.every((item) => item.checked)) return null;
  return previousTimestamp ?? now();
}

export const preparationService = Object.freeze({
  async ensureSnapshot(trip) {
    if (trip.preparationSnapshotCreatedAt) return trip;
    const preparationItems = await createSnapshotItems();
    const timestamp = now();
    const updated = {
      ...trip, preparationItems, preparationSnapshotCreatedAt: timestamp,
      preparationCompletedAt: completionTimestamp(preparationItems, null),
      updatedAt: timestamp, revision: trip.revision + 1
    };
    await tripsRepository.put(updated);
    return updated;
  },

  async updateItem(tripId, itemId, checked) {
    const trip = await tripsRepository.get(tripId);
    if (!trip || trip.status !== "active") throw new Error("Den aktive tur kunne ikke findes.");
    if (trip.preparationClosedAt) throw new Error("Klargøringen er afsluttet og kan ikke længere ændres.");
    let found = false;
    const timestamp = now();
    const preparationItems = trip.preparationItems.map((item) => {
      if (item.id !== itemId) return item;
      found = true;
      return { ...item, checked, checkedAt: checked ? (item.checkedAt ?? timestamp) : null };
    });
    if (!found) throw new Error("Klargøringspunktet findes ikke længere.");
    const updated = {
      ...trip, preparationItems,
      preparationCompletedAt: completionTimestamp(preparationItems, trip.preparationCompletedAt),
      updatedAt: timestamp, revision: trip.revision + 1
    };
    await tripsRepository.put(updated);
    return updated;
  }
});
