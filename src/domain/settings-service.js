import { STORE_NAMES } from "../config.js";
import { createRepository } from "../storage/repositories.js";
import { validateCategory, validateMasterItem, validatePackingRule, validatePerson } from "./validation.js";

const repositories = Object.fromEntries(Object.entries(STORE_NAMES).map(([key, store]) => [key, createRepository(store)]));
const validators = { people: validatePerson, categories: validateCategory, packingRules: validatePackingRule, masterItems: validateMasterItem };

const timestamp = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

async function nextSortOrder(repository, filter = () => true) {
  const records = (await repository.getAll()).filter(filter);
  return Math.max(0, ...records.map((record) => Number(record.sortOrder) || 0)) + 10;
}

export const settingsService = Object.freeze({
  list(type) {
    const repository = repositories[type];
    if (!repository) throw new Error("Ukendt datatype.");
    return repository.getAll();
  },

  async save(type, input) {
    const repository = repositories[type];
    const validator = validators[type];
    if (!repository || !validator) throw new Error("Denne datatype kan ikke redigeres.");

    const existing = input.id ? await repository.get(input.id) : null;
    const candidate = validator({
      ...existing,
      ...input,
      id: existing?.id ?? uuid(),
      createdAt: existing?.createdAt ?? timestamp(),
      updatedAt: timestamp(),
      revision: (existing?.revision ?? 0) + 1,
      sortOrder: input.sortOrder ?? existing?.sortOrder ?? await nextSortOrder(repository)
    });
    await repository.put(candidate);
    return candidate;
  },

  async toggleActive(type, id) {
    const repository = repositories[type];
    const record = await repository.get(id);
    if (!record) throw new Error("Posten findes ikke længere.");
    const updated = { ...record, active: !record.active, updatedAt: timestamp(), revision: (record.revision ?? 0) + 1 };
    await repository.put(updated);
    return updated;
  },

  async remove(type, id) {
    const repository = repositories[type];
    const record = await repository.get(id);
    if (!record) return;

    if (type === "categories") {
      const items = await repositories.masterItems.getAll();
      const templates = await repositories.personItemTemplates.getAll();
      if (items.some((item) => item.categoryId === id) || templates.some((item) => item.categoryId === id)) {
        throw new Error("Kategorien bruges af checklistpunkter og kan derfor kun deaktiveres.");
      }
    }
    if (type === "packingRules") {
      const items = await repositories.masterItems.getAll();
      const templates = await repositories.personItemTemplates.getAll();
      if (items.some((item) => item.packingRuleId === id) || templates.some((item) => item.packingRuleId === id)) {
        throw new Error("Reglen bruges af checklistpunkter og kan derfor kun deaktiveres.");
      }
    }
    if (type === "people") {
      const items = await repositories.masterItems.getAll();
      if (items.some((item) => item.personId === id)) {
        throw new Error("Personen har personlige punkter og kan derfor kun deaktiveres.");
      }
    }
    await repository.delete(id);
  },

  async move(type, id, direction) {
    const repository = repositories[type];
    const records = (await repository.getAll()).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const index = records.findIndex((record) => record.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= records.length) return;
    const current = records[index];
    const target = records[targetIndex];
    const currentOrder = current.sortOrder;
    await repository.put({ ...current, sortOrder: target.sortOrder, updatedAt: timestamp(), revision: current.revision + 1 });
    await repository.put({ ...target, sortOrder: currentOrder, updatedAt: timestamp(), revision: target.revision + 1 });
  },

  async createPersonWithTemplates(name, includeTemplates) {
    const person = await this.save("people", { name, active: true });
    if (!includeTemplates) return person;
    const templates = (await repositories.personItemTemplates.getAll()).filter((item) => item.active);
    for (const template of templates) {
      await this.save("masterItems", {
        scope: "packing", categoryId: template.categoryId, title: template.title, description: "",
        inclusionType: "personal", personId: person.id, quantityMode: "rule", packingRuleId: template.packingRuleId,
        fixedQuantity: null, unit: template.unit, active: true, sourceReference: template.sourceReference
      });
    }
    return person;
  }
});
