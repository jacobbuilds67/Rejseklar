const ITEM_SCOPES = new Set(["packing", "preparation", "flightCheck"]);
const INCLUSION_TYPES = new Set(["always", "optional", "personal"]);
const QUANTITY_MODES = new Set(["none", "fixed", "rule", "manual"]);
const RULE_KINDS = new Set(["fixed", "perDay", "perPeriod", "daysPlus", "manual", "perSelectedPerson"]);

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} skal udfyldes.`);
  return text;
}

function nonNegativeNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} skal være nul eller højere.`);
  return number;
}

export function validateIsoDate(value, label = "Dato") {
  const text = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} skal være en gyldig dato.`);
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label} skal være en gyldig dato.`);
  }
  return text;
}

export function normalizeNonNegativeQuantity(value, fallback = 1) {
  if (value === "" || value === null || value === undefined) return fallback;
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.max(0, quantity) : fallback;
}

export function validatePerson(input) {
  return { ...input, name: requiredText(input.name, "Navn"), active: input.active !== false };
}

export function validateCategory(input) {
  if (!ITEM_SCOPES.has(input.scope)) throw new Error("Vælg et gyldigt område.");
  return { ...input, name: requiredText(input.name, "Kategorinavn"), active: input.active !== false };
}

export function validatePackingRule(input) {
  if (!RULE_KINDS.has(input.kind)) throw new Error("Vælg en gyldig regeltype.");
  const rule = { ...input, name: requiredText(input.name, "Regelnavn"), active: input.active !== false };
  if (["fixed", "perDay"].includes(rule.kind)) rule.value = nonNegativeNumber(rule.value, "Antal");
  if (rule.kind === "perPeriod") {
    rule.value = nonNegativeNumber(rule.value, "Antal dage");
    if (rule.value === 0) throw new Error("Antal dage skal være større end nul.");
  }
  if (rule.kind === "daysPlus") rule.extra = nonNegativeNumber(rule.extra, "Ekstra antal");
  return rule;
}

export function validateMasterItem(input) {
  if (!ITEM_SCOPES.has(input.scope)) throw new Error("Vælg et gyldigt område.");
  if (!INCLUSION_TYPES.has(input.inclusionType)) throw new Error("Vælg en gyldig punkttype.");
  if (!QUANTITY_MODES.has(input.quantityMode)) throw new Error("Vælg en gyldig mængdetype.");
  if (!input.categoryId) throw new Error("Vælg en kategori.");
  if (input.inclusionType === "personal" && !input.personId) throw new Error("Vælg den person, punktet tilhører.");
  if (input.quantityMode === "rule" && !input.packingRuleId) throw new Error("Vælg en pakkeregel.");
  return {
    ...input,
    title: requiredText(input.title, "Punktets navn"),
    description: String(input.description ?? "").trim(),
    unit: String(input.unit ?? "stk.").trim(),
    active: input.active !== false
  };
}

export const allowedValues = Object.freeze({
  scopes: ITEM_SCOPES,
  inclusionTypes: INCLUSION_TYPES,
  quantityModes: QUANTITY_MODES,
  ruleKinds: RULE_KINDS
});
