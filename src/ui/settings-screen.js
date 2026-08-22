import { settingsService } from "../domain/settings-service.js";
import { escapeHtml, option } from "./html.js";

const LABELS = {
  packing: "Pakning", preparation: "Klargøring", flightCheck: "Flight Check",
  always: "Altid", optional: "Valgfrit", personal: "Personligt",
  fixed: "Fast antal", perDay: "Antal pr. dag", perPeriod: "Én pr. X dage",
  daysPlus: "Antal dage + ekstra", manual: "Manuel mængde", perSelectedPerson: "Én pr. valgt person",
  none: "Ingen mængde", rule: "Pakkeregel"
};

const routeTypes = { people: "people", categories: "categories", rules: "packingRules", items: "masterItems" };

function shell(title, intro, content, action = "") {
  return `<section class="settings-page">
    <a class="back-link" href="#/settings">‹ Indstillinger</a>
    <div class="page-title-row"><div><h2 class="section-heading">${title}</h2><p class="section-intro">${intro}</p></div>${action}</div>
    <div id="settings-message" aria-live="polite"></div>${content}
  </section>`;
}

function listActions(type, record) {
  return `<div class="item-actions">
    <button type="button" class="quiet-button" data-action="edit" data-type="${type}" data-id="${record.id}">Redigér</button>
    <button type="button" class="quiet-button" data-action="toggle" data-type="${type}" data-id="${record.id}">${record.active ? "Deaktivér" : "Aktivér"}</button>
    <button type="button" class="danger-button" data-action="delete" data-type="${type}" data-id="${record.id}">Slet</button>
  </div>`;
}

function addButton(type, label) {
  return `<button class="small-primary-button" type="button" data-action="add" data-type="${type}">+ ${label}</button>`;
}

async function peopleScreen() {
  const people = (await settingsService.list("people")).sort((a, b) => a.name.localeCompare(b.name, "da"));
  const cards = people.length ? people.map((person) => `<article class="admin-item${person.active ? "" : " is-inactive"}">
    <div><h3>${escapeHtml(person.name)}</h3><p>${person.active ? "Aktiv" : "Deaktiveret"}</p></div>${listActions("people", person)}
  </article>`).join("") : `<div class="empty-card"><p>Der er endnu ingen personer.</p></div>`;
  return shell("Personer", "Opret deltagere og giv dem deres egne pakkelister.", cards, addButton("people", "Ny person"));
}

async function categoriesScreen() {
  const categories = (await settingsService.list("categories")).sort((a, b) => a.scope.localeCompare(b.scope) || a.sortOrder - b.sortOrder);
  const cards = categories.map((category) => `<article class="admin-item${category.active ? "" : " is-inactive"}">
    <div><span class="type-badge">${LABELS[category.scope]}</span><h3>${escapeHtml(category.name)}</h3></div>
    ${listActions("categories", category)}
  </article>`).join("");
  return shell("Kategorier", "Kategorierne bestemmer gruppering og rækkefølge i checklisterne.", cards, addButton("categories", "Ny kategori"));
}

async function rulesScreen() {
  const rules = (await settingsService.list("packingRules")).sort((a, b) => a.sortOrder - b.sortOrder);
  const cards = rules.map((rule) => `<article class="admin-item${rule.active ? "" : " is-inactive"}">
    <div><span class="type-badge">${LABELS[rule.kind]}</span><h3>${escapeHtml(rule.name)}</h3></div>
    ${listActions("packingRules", rule)}
  </article>`).join("");
  return shell("Pakkeregler", "Regler beregner mængder uden programmering eller formler.", cards, addButton("packingRules", "Ny regel"));
}

async function itemsScreen(params) {
  const [items, categories, people] = await Promise.all([
    settingsService.list("masterItems"), settingsService.list("categories"), settingsService.list("people")
  ]);
  const scope = params.get("scope") || "packing";
  const search = (params.get("q") || "").toLocaleLowerCase("da");
  const categoryMap = new Map(categories.map((item) => [item.id, item.name]));
  const personMap = new Map(people.map((item) => [item.id, item.name]));
  const visible = items.filter((item) => item.scope === scope && (!search || item.title.toLocaleLowerCase("da").includes(search)))
    .sort((a, b) => (categoryMap.get(a.categoryId) ?? "").localeCompare(categoryMap.get(b.categoryId) ?? "", "da") || a.sortOrder - b.sortOrder);
  const filters = `<form class="filter-bar" data-filter-form>
    <label>Område<select name="scope">${["packing", "preparation", "flightCheck"].map((value) => option(value, LABELS[value], scope)).join("")}</select></label>
    <label>Søg<input name="q" type="search" value="${escapeHtml(params.get("q") || "")}" placeholder="Søg i punkter"></label>
    <button class="quiet-button" type="submit">Vis</button>
  </form>`;
  const cards = visible.length ? visible.map((item) => `<article class="admin-item${item.active ? "" : " is-inactive"}">
    <div><span class="type-badge">${escapeHtml(categoryMap.get(item.categoryId) || "Ukendt kategori")}</span><h3>${escapeHtml(item.title)}</h3>
      <p>${LABELS[item.inclusionType]}${item.personId ? ` · ${escapeHtml(personMap.get(item.personId) || "Ukendt person")}` : ""}</p></div>
    ${listActions("masterItems", item)}
  </article>`).join("") : `<div class="empty-card"><p>Ingen punkter matcher filteret.</p></div>`;
  return shell("Checklistpunkter", "Alle punkter er masterdata og kan ændres uden kodeændringer.", filters + cards, addButton("masterItems", "Nyt punkt"));
}

function personForm(record = {}) {
  return `<form method="dialog" data-editor-form data-type="people" data-id="${record.id || ""}">
    <h2>${record.id ? "Redigér person" : "Ny person"}</h2>
    <label>Navn<input name="name" required maxlength="80" value="${escapeHtml(record.name || "")}" autofocus></label>
    ${record.id ? "" : `<label class="check-row"><input name="includeTemplates" type="checkbox" checked> Tilføj standardlisten med tøj og fodtøj</label>`}
    ${formButtons()}
  </form>`;
}

function categoryForm(record = {}) {
  return `<form method="dialog" data-editor-form data-type="categories" data-id="${record.id || ""}">
    <h2>${record.id ? "Redigér kategori" : "Ny kategori"}</h2>
    <label>Navn<input name="name" required maxlength="100" value="${escapeHtml(record.name || "")}" autofocus></label>
    <label>Område<select name="scope">${["packing", "preparation", "flightCheck"].map((value) => option(value, LABELS[value], record.scope || "packing")).join("")}</select></label>
    ${formButtons()}
  </form>`;
}

function ruleForm(record = {}) {
  return `<form method="dialog" data-editor-form data-type="packingRules" data-id="${record.id || ""}">
    <h2>${record.id ? "Redigér pakkeregel" : "Ny pakkeregel"}</h2>
    <label>Navn<input name="name" required maxlength="100" value="${escapeHtml(record.name || "")}" autofocus></label>
    <label>Regeltype<select name="kind" data-rule-kind>${Object.keys(LABELS).filter((key) => ["fixed", "perDay", "perPeriod", "daysPlus", "manual", "perSelectedPerson"].includes(key)).map((value) => option(value, LABELS[value], record.kind || "fixed")).join("")}</select></label>
    <label data-value-field>Værdi<input name="value" type="number" min="0" step="1" value="${escapeHtml(record.value ?? 1)}"></label>
    <label data-extra-field>Ekstra antal<input name="extra" type="number" min="0" step="1" value="${escapeHtml(record.extra ?? 1)}"></label>
    ${formButtons()}
  </form>`;
}

async function itemForm(record = {}) {
  const [categories, people, rules] = await Promise.all([
    settingsService.list("categories"), settingsService.list("people"), settingsService.list("packingRules")
  ]);
  const scope = record.scope || "packing";
  return `<form method="dialog" data-editor-form data-type="masterItems" data-id="${record.id || ""}">
    <h2>${record.id ? "Redigér punkt" : "Nyt checklistpunkt"}</h2>
    <label>Navn<input name="title" required maxlength="160" value="${escapeHtml(record.title || "")}" autofocus></label>
    <label>Område<select name="scope" data-item-scope>${["packing", "preparation", "flightCheck"].map((value) => option(value, LABELS[value], scope)).join("")}</select></label>
    <label>Kategori<select name="categoryId" data-category-select>${categories.filter((item) => item.active).map((item) => `<option data-scope="${item.scope}" value="${item.id}"${item.id === record.categoryId ? " selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></label>
    <label>Type<select name="inclusionType" data-inclusion-type>${["always", "optional", "personal"].map((value) => option(value, LABELS[value], record.inclusionType || "always")).join("")}</select></label>
    <label data-person-field>Person<select name="personId"><option value="">Vælg person</option>${people.filter((item) => item.active).map((item) => option(item.id, item.name, record.personId)).join("")}</select></label>
    <label>Mængde<select name="quantityMode" data-quantity-mode>${["none", "fixed", "rule", "manual"].map((value) => option(value, LABELS[value], record.quantityMode || (scope === "packing" ? "fixed" : "none"))).join("")}</select></label>
    <label data-fixed-field>Fast antal<input name="fixedQuantity" type="number" min="0" step="1" value="${escapeHtml(record.fixedQuantity ?? 1)}"></label>
    <label data-rule-field>Pakkeregel<select name="packingRuleId"><option value="">Vælg regel</option>${rules.filter((item) => item.active).map((item) => option(item.id, item.name, record.packingRuleId)).join("")}</select></label>
    <label>Beskrivelse<textarea name="description" rows="3">${escapeHtml(record.description || "")}</textarea></label>
    ${formButtons()}
  </form>`;
}

function formButtons() {
  return `<div class="dialog-actions"><button type="button" class="quiet-button" data-close-dialog>Annullér</button><button type="submit" class="small-primary-button">Gem</button></div>`;
}

function formDataObject(form) {
  const data = Object.fromEntries(new FormData(form));
  data.active = true;
  if (data.value !== undefined) data.value = Number(data.value);
  if (data.extra !== undefined) data.extra = Number(data.extra);
  if (data.fixedQuantity !== undefined) data.fixedQuantity = Number(data.fixedQuantity);
  return data;
}

function updateConditionalFields(form) {
  const kind = form.elements.kind?.value;
  form.querySelector("[data-value-field]")?.toggleAttribute("hidden", !["fixed", "perDay", "perPeriod"].includes(kind));
  form.querySelector("[data-extra-field]")?.toggleAttribute("hidden", kind !== "daysPlus");
  const inclusion = form.elements.inclusionType?.value;
  form.querySelector("[data-person-field]")?.toggleAttribute("hidden", inclusion !== "personal");
  const quantity = form.elements.quantityMode?.value;
  form.querySelector("[data-fixed-field]")?.toggleAttribute("hidden", quantity !== "fixed");
  form.querySelector("[data-rule-field]")?.toggleAttribute("hidden", quantity !== "rule");
  const scope = form.elements.scope?.value;
  const categorySelect = form.querySelector("[data-category-select]");
  if (categorySelect) {
    [...categorySelect.options].forEach((entry) => { entry.hidden = entry.dataset.scope !== scope; });
    if (categorySelect.selectedOptions[0]?.hidden) categorySelect.value = [...categorySelect.options].find((entry) => !entry.hidden)?.value || "";
  }
}

async function openEditor(type, id) {
  const record = id ? await settingsService.list(type).then((records) => records.find((item) => item.id === id)) : {};
  const html = type === "people" ? personForm(record) : type === "categories" ? categoryForm(record) : type === "packingRules" ? ruleForm(record) : await itemForm(record);
  const dialog = document.querySelector("#editor-dialog");
  dialog.innerHTML = html;
  updateConditionalFields(dialog.querySelector("form"));
  dialog.showModal();
}

export async function renderSettingsSection(section, params) {
  if (section === "people") return peopleScreen();
  if (section === "categories") return categoriesScreen();
  if (section === "rules") return rulesScreen();
  if (section === "items") return itemsScreen(params);
  return null;
}

export function bindSettingsEvents(refresh) {
  const main = document.querySelector("#main-content");
  main.onclick = async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, type, id } = button.dataset;
    try {
      if (action === "add" || action === "edit") return openEditor(type, id);
      if (action === "toggle") await settingsService.toggleActive(type, id);
      if (action === "delete") {
        if (!confirm("Vil du slette permanent? Historiske snapshots påvirkes ikke.")) return;
        await settingsService.remove(type, id);
      }
      await refresh();
    } catch (error) {
      showMessage(error.message, true);
    }
  };

  main.querySelector("[data-filter-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new URLSearchParams(new FormData(event.currentTarget));
    location.hash = `#/settings/items?${values}`;
  });

  const dialog = document.querySelector("#editor-dialog");
  dialog.onchange = (event) => updateConditionalFields(event.currentTarget.querySelector("form"));
  dialog.onclick = (event) => { if (event.target.closest("[data-close-dialog]")) dialog.close(); };
  dialog.onsubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    try {
      const values = formDataObject(form);
      if (form.dataset.type === "people" && !form.dataset.id) {
        await settingsService.createPersonWithTemplates(values.name, form.elements.includeTemplates.checked);
      } else {
        await settingsService.save(form.dataset.type, { ...values, id: form.dataset.id || undefined });
      }
      dialog.close();
      await refresh();
      showMessage("Ændringen er gemt.");
    } catch (error) {
      const errorNode = form.querySelector(".form-error") || document.createElement("p");
      errorNode.className = "form-error";
      errorNode.setAttribute("role", "alert");
      errorNode.textContent = error.message;
      form.prepend(errorNode);
    }
  };
}

function showMessage(message, isError = false) {
  const element = document.querySelector("#settings-message");
  if (!element) return;
  element.className = isError ? "inline-message is-error" : "inline-message";
  element.textContent = message;
}
