import { tripService } from "../domain/trip-service.js";
import { preparationService } from "../domain/preparation-service.js";
import { flightCheckService } from "../domain/flight-check-service.js";
import { escapeHtml } from "./html.js";

function formatDate(date) {
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function progressFor(items) {
  const active = items.filter((item) => !item.removed);
  const completed = active.filter((item) => item.checked).length;
  return { completed, total: active.length, percent: active.length ? Math.round(completed / active.length * 100) : 0 };
}

function tripOverview(trip) {
  const progress = progressFor(trip.packingItems);
  const preparationProgress = progressFor(trip.preparationItems);
  const participants = trip.participantSnapshots.map((person) => person.name).join(", ") || "Ingen deltagere valgt";
  return `<section>
    <div class="trip-heading"><div><p class="eyebrow" style="color: var(--color-accent)">Aktuel tur</p><h2>${escapeHtml(trip.name)}</h2></div>
      <a class="quiet-button button-link" href="#/current/edit">Redigér tur</a></div>
    <div class="trip-facts"><span>${formatDate(trip.departureDate)}</span><span>${trip.durationDays} ${trip.durationDays === 1 ? "dag" : "dage"}</span><span>${escapeHtml(participants)}</span></div>
    <div class="workflow-list">
      <a class="workflow-card" href="#/current/packing"><div><span class="step-number">1</span><h3>Pakning</h3></div>
        <p>${progress.completed} af ${progress.total} pakket · ${progress.percent} %</p><progress max="100" value="${progress.percent}">${progress.percent} %</progress></a>
      <a class="workflow-card${trip.preparationCompletedAt ? " is-complete" : ""}" href="#/current/preparation"><div><span class="step-number">2</span><h3>Klargøring</h3></div>
        <p>${trip.preparationCompletedAt ? "Gennemført" : `${preparationProgress.completed} af ${preparationProgress.total} klargjort · ${preparationProgress.percent} %`}</p>
        <progress max="100" value="${preparationProgress.percent}">${preparationProgress.percent} %</progress></a>
      <a class="workflow-card flight-card" href="#/current/flight-check"><div><span class="step-number">3</span><h3>Flight Check</h3></div>
        <p>${flightOverviewText(trip)}</p></a>
    </div>
    ${(trip.flightChecks ?? []).some((check) => check.status === "completed") ? `<section class="finish-trip-panel"><h3>Er turen slut?</h3><p>Afslut turen for at flytte den til Historik. Turdata og alle Flight Checks bliver read-only.</p>
      <button class="danger-outline-button" type="button" data-complete-trip data-trip-id="${trip.id}">Afslut tur</button></section>` : ""}
  </section>`;
}

function flightOverviewText(trip) {
  const checks = trip.flightChecks ?? [];
  const inProgress = checks.find((check) => check.status === "inProgress");
  if (inProgress) return `${inProgress.totalItemCount - inProgress.completedItemCount} punkter mangler`;
  if (checks.length) return `${checks.filter((check) => check.status === "completed").length} gennemført · Start nyt før næste kørsel`;
  return "Start før første afgang";
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("da-DK", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

function preparationScreen(trip) {
  const visible = trip.preparationItems.filter((item) => !item.removed);
  const progress = progressFor(visible);
  const groups = new Map();
  visible.sort((a, b) => a.categorySnapshot.sortOrder - b.categorySnapshot.sortOrder || a.sortOrder - b.sortOrder)
    .forEach((item) => {
      const key = item.categorySnapshot.name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
  const closedPanel = trip.preparationClosedAt ? `<div class="closed-panel" role="status"><strong>Klargøring afsluttet ved første afgang</strong><span>Status er bevaret og kan ikke længere ændres.</span></div>` : "";
  const completedPanel = trip.preparationCompletedAt ? `<div class="complete-panel" role="status"><strong>✓ Klargøring gennemført</strong><span>Alle aktive punkter er udført.</span></div>` : "";
  const content = [...groups.entries()].map(([category, items]) => `<section class="checklist-group">
    <h3>${escapeHtml(category)}</h3>
    ${items.map((item) => `<article class="checklist-row preparation-row${item.checked ? " is-checked" : ""}" data-preparation-item="${item.id}">
      <label class="check-main"><input type="checkbox" data-preparation-check aria-label="${escapeHtml(item.title)} udført"${item.checked ? " checked" : ""}${trip.preparationClosedAt ? " disabled" : ""}>
        <span><strong>${escapeHtml(item.title)}</strong>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}</span></label>
    </article>`).join("")}
  </section>`).join("");
  return `<section class="preparation-page" data-preparation-trip-id="${trip.id}">
    <a class="back-link" href="#/current">‹ ${escapeHtml(trip.name)}</a>
    <div class="packing-status"><div><p>Klargjort</p><strong data-preparation-progress>${progress.completed} af ${progress.total}</strong></div><strong data-preparation-percent>${progress.percent} %</strong></div>
    <progress class="large-progress" max="100" value="${progress.percent}">${progress.percent} %</progress>
    <h2>Klargøring</h2><p class="section-intro">Status gemmes efter hver afkrydsning, så du kan fortsætte senere.</p>
    <div id="preparation-message" aria-live="polite"></div>${closedPanel}${completedPanel}${content || `<div class="empty-card"><p>Klargøringslisten er tom.</p></div>`}
  </section>`;
}

function flightCheckHistory(checks) {
  const completed = checks.filter((check) => check.status === "completed").sort((a, b) => b.sequenceNumber - a.sequenceNumber);
  if (!completed.length) return "";
  return `<section class="flight-history"><h3>Tidligere Flight Checks</h3>${completed.map((check) => `<article>
    <strong>Flight Check ${check.sequenceNumber}</strong><span>${formatDateTime(check.completedAt)}</span><span>✓ ${check.completedItemCount} af ${check.totalItemCount}</span>
  </article>`).join("")}</section>`;
}

function flightCheckScreen(trip) {
  const checks = trip.flightChecks ?? [];
  const current = checks.find((check) => check.status === "inProgress");
  if (!current) {
    const latest = [...checks].filter((check) => check.status === "completed").sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0];
    return `<section class="flight-page" data-flight-trip-id="${trip.id}">
      <a class="back-link" href="#/current">‹ ${escapeHtml(trip.name)}</a>
      <div class="flight-hero ${latest ? "is-ready" : ""}">
        <p class="eyebrow">Sikkerhed før kørsel</p>
        <h2>${latest ? "FLIGHT CHECK COMPLETE" : "Start Flight Check"}</h2>
        ${latest ? `<strong>KLAR TIL AFGANG</strong><span>${formatDateTime(latest.completedAt)} · ${latest.completedItemCount} af ${latest.totalItemCount} punkter</span>` : `<p>Alle aktive sikkerhedspunkter skal gennemføres før afgang.</p>`}
      </div>
      <button class="primary-button flight-start-button" type="button" data-start-flight>${latest ? "Start nyt Flight Check" : "Start Flight Check"}</button>
      <div id="flight-message" aria-live="polite"></div>
      ${flightCheckHistory(checks)}
    </section>`;
  }
  const remaining = current.totalItemCount - current.completedItemCount;
  const stateClass = remaining === 0 ? "is-ready" : remaining <= 2 ? "is-warning" : "is-danger";
  const groups = new Map();
  current.items.forEach((item) => {
    const key = item.categorySnapshot.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  const items = [...groups.entries()].map(([category, entries]) => `<section class="checklist-group flight-group"><h3>${escapeHtml(category)}</h3>${entries.map((item) => `
    <article class="checklist-row preparation-row${item.completed ? " is-checked" : ""}" data-flight-item="${item.id}">
      <label class="check-main"><input type="checkbox" data-flight-check aria-label="${escapeHtml(item.title)} udført"${item.completed ? " checked" : ""}>
        <span><strong>${escapeHtml(item.title)}</strong></span></label></article>`).join("")}</section>`).join("");
  return `<section class="flight-page" data-flight-trip-id="${trip.id}" data-flight-check-id="${current.id}">
    <a class="back-link" href="#/current">‹ ${escapeHtml(trip.name)}</a>
    <div class="flight-status ${stateClass}" role="status"><span>${remaining === 0 ? "●" : remaining <= 2 ? "●" : "●"}</span>
      <div><strong data-flight-remaining>${remaining === 0 ? "Alle punkter markeret" : `${remaining} ${remaining === 1 ? "punkt mangler" : "punkter mangler"}`}</strong><small>Flight Check ${current.sequenceNumber}</small></div></div>
    <p class="flight-instruction">Kontrollér hvert punkt fysisk, før du markerer det.</p>
    <div id="flight-message" aria-live="polite"></div>${items}
    ${remaining === 0 ? `<button class="primary-button complete-flight-button" type="button" data-complete-flight>Lås og færdiggør Flight Check</button>` : ""}
    ${flightCheckHistory(checks)}
  </section>`;
}

function noTripScreen() {
  return `<section class="hero empty-state">
    <p class="eyebrow" style="color: var(--color-accent)">Aktuel tur</p>
    <h2>Hvor går turen hen?</h2>
    <p>Opret turen, vælg deltagere og tilvalgsudstyr, så genererer Rejseklar pakkelisten.</p>
    <a class="primary-button button-link" href="#/current/new">+ Ny tur</a>
  </section>`;
}

function checkboxList(title, name, entries, selected = new Set()) {
  if (!entries.length) return `<div class="choice-section"><h3>${title}</h3><p class="section-intro">Ingen valgmuligheder endnu.</p></div>`;
  return `<fieldset class="choice-section"><legend>${title}</legend><div class="choice-list">${entries.map((entry) => `
    <label class="choice-row"><input type="checkbox" name="${name}" value="${entry.id}"${selected.has(entry.id) ? " checked" : ""}>
      <span><strong>${escapeHtml(entry.name ?? entry.title)}</strong>${entry.categoryName ? `<small>${escapeHtml(entry.categoryName)}</small>` : ""}</span></label>`).join("")}</div></fieldset>`;
}

async function newTripScreen() {
  const [activeTrip, options] = await Promise.all([tripService.getActiveTrip(), tripService.getOptions()]);
  if (activeTrip) return tripOverview(activeTrip);
  const today = new Date().toISOString().slice(0, 10);
  return `<section class="form-page">
    <a class="back-link" href="#/current">‹ Aktuel tur</a>
    <h2>Opret ny tur</h2><p class="section-intro">Pakkelisten bliver et snapshot af dine nuværende masterdata.</p>
    <form data-new-trip-form class="stack-form">
      <label>Turnavn<input name="name" required maxlength="120" placeholder="Fx Sommerferie Alsace 2026" autofocus></label>
      <div class="form-grid"><label>Afrejsedato<input name="departureDate" type="date" required value="${today}"></label>
      <label>Antal dage<input name="durationDays" type="number" inputmode="numeric" min="1" max="366" required value="7"></label></div>
      ${checkboxList("Personer", "participantIds", options.people)}
      ${checkboxList("Valgfrit udstyr", "selectedOptionalItemIds", options.optionalItems)}
      <div class="form-error" data-form-error hidden role="alert"></div>
      <button class="primary-button" type="submit">Opret tur og pakkeliste</button>
    </form>
  </section>`;
}

function editTripScreen(trip) {
  return `<section class="form-page">
    <a class="back-link" href="#/current">‹ Aktuel tur</a>
    <h2>Redigér tur</h2><p class="section-intro">Ændres antal dage, genberegnes automatiske mængder. Afkrydsninger bevares.</p>
    <form data-edit-trip-form data-trip-id="${trip.id}" class="stack-form">
      <label>Turnavn<input name="name" required maxlength="120" value="${escapeHtml(trip.name)}"></label>
      <div class="form-grid"><label>Afrejsedato<input name="departureDate" type="date" required value="${trip.departureDate}"></label>
      <label>Antal dage<input name="durationDays" type="number" inputmode="numeric" min="1" max="366" required value="${trip.durationDays}"${trip.initialDepartureAt ? " readonly" : ""}></label></div>
      <p class="helper-text">Deltagere og valgfrit udstyr kan ikke ændres efter generering i denne version. Punkter kan tilføjes eller fjernes direkte på pakkelisten.</p>
      <div class="form-error" data-form-error hidden role="alert"></div>
      <button class="primary-button" type="submit">Gem ændringer</button>
    </form>
  </section>`;
}

function packingScreen(trip) {
  const visible = trip.packingItems.filter((item) => !item.removed);
  const progress = progressFor(visible);
  const groups = new Map();
  visible.sort((a, b) => a.categorySnapshot.sortOrder - b.categorySnapshot.sortOrder || a.sortOrder - b.sortOrder)
    .forEach((item) => {
      const key = item.categorySnapshot.name;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
  const content = [...groups.entries()].map(([category, items]) => `<section class="checklist-group">
    <h3>${escapeHtml(category)}</h3>
    ${items.map((item) => `<article class="checklist-row${item.checked ? " is-checked" : ""}" data-packing-item="${item.id}">
      <label class="check-main"><input type="checkbox" data-pack-check aria-label="${escapeHtml(item.title)} pakket"${item.checked ? " checked" : ""}${trip.packingClosedAt ? " disabled" : ""}>
        <span><strong>${escapeHtml(item.title)}</strong>${item.personSnapshot ? `<small>${escapeHtml(item.personSnapshot.name)}</small>` : ""}</span></label>
      <div class="quantity-control">${item.quantity === null ? "" : `<label>Antal<input type="number" data-pack-quantity inputmode="numeric" min="0" value="${item.quantity}" aria-label="Antal ${escapeHtml(item.title)}"${trip.packingClosedAt ? " disabled" : ""}></label>`}
        ${trip.packingClosedAt ? "" : `<button class="icon-button" type="button" data-remove-pack aria-label="Fjern ${escapeHtml(item.title)} fra turen">×</button>`}</div>
    </article>`).join("")}
  </section>`).join("");
  return `<section class="packing-page" data-trip-id="${trip.id}">
    <a class="back-link" href="#/current">‹ ${escapeHtml(trip.name)}</a>
    <div class="packing-status"><div><p>Pakket</p><strong data-progress-label>${progress.completed} af ${progress.total}</strong></div><strong data-progress-percent>${progress.percent} %</strong></div>
    <progress class="large-progress" max="100" value="${progress.percent}">${progress.percent} %</progress>
    <div class="packing-toolbar"><h2>Pakning</h2>${trip.packingClosedAt ? "" : `<button class="small-primary-button" type="button" data-add-trip-item>+ Tilføj punkt</button>`}</div>
    <div id="packing-message" aria-live="polite"></div>
    ${trip.packingClosedAt ? `<div class="closed-panel"><strong>Pakning afsluttet ved første afgang</strong><span>Status er bevaret og kan ikke længere ændres.</span></div>` : ""}
    ${content || `<div class="empty-card"><p>Pakkelisten er tom.</p></div>`}
  </section>`;
}

function selectedValues(form, name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function showFormError(form, message) {
  const node = form.querySelector("[data-form-error]");
  node.textContent = message;
  node.hidden = false;
}

function addItemDialog() {
  const dialog = document.querySelector("#editor-dialog");
  dialog.innerHTML = `<form method="dialog" data-add-trip-item-form><h2>Tilføj til denne tur</h2>
    <label>Navn<input name="title" required maxlength="160" autofocus></label>
    <label>Antal<input name="quantity" type="number" min="0" inputmode="numeric" value="1"></label>
    <div class="form-error" data-form-error hidden role="alert"></div>
    <div class="dialog-actions"><button type="button" class="quiet-button" data-close-dialog>Annullér</button><button class="small-primary-button" type="submit">Tilføj</button></div></form>`;
  dialog.showModal();
}

export async function renderCurrentSection(section) {
  if (section === "new") return newTripScreen();
  let trip = await tripService.getActiveTrip();
  if (!trip) return noTripScreen();
  trip = await preparationService.ensureSnapshot(trip);
  if (section === "packing") return packingScreen(trip);
  if (section === "preparation") return preparationScreen(trip);
  if (section === "flight-check") return flightCheckScreen(trip);
  if (section === "edit") return editTripScreen(trip);
  return tripOverview(trip);
}

export function bindTripEvents(refresh) {
  const main = document.querySelector("#main-content");
  main.querySelector("[data-complete-trip]")?.addEventListener("click", async (event) => {
    if (!confirm("Afslut turen og flyt den til Historik? Turen kan derefter ikke redigeres.")) return;
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Afslutter…";
    try {
      const trip = await tripService.completeTrip(button.dataset.tripId);
      location.hash = `#/history/${trip.id}`;
    } catch (error) {
      button.disabled = false;
      button.textContent = "Afslut tur";
      const panel = button.closest(".finish-trip-panel");
      const message = document.createElement("p");
      message.className = "form-error";
      message.textContent = error.message;
      panel.append(message);
    }
  });
  const newForm = main.querySelector("[data-new-trip-form]");
  newForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await tripService.createTrip({
        name: data.get("name"), departureDate: data.get("departureDate"), durationDays: data.get("durationDays"),
        participantIds: selectedValues(form, "participantIds"),
        selectedOptionalItemIds: selectedValues(form, "selectedOptionalItemIds")
      });
      location.hash = "#/current";
    } catch (error) { showFormError(form, error.message); }
  });

  const editForm = main.querySelector("[data-edit-trip-form]");
  editForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await tripService.updateDetails(form.dataset.tripId, Object.fromEntries(data));
      location.hash = "#/current";
    } catch (error) { showFormError(form, error.message); }
  });

  const packingPage = main.querySelector("[data-trip-id]");
  const preparationPage = main.querySelector("[data-preparation-trip-id]");
  preparationPage?.addEventListener("change", async (event) => {
    if (!event.target.matches("[data-preparation-check]")) return;
    const row = event.target.closest("[data-preparation-item]");
    try {
      await preparationService.updateItem(preparationPage.dataset.preparationTripId, row.dataset.preparationItem, event.target.checked);
      await refresh();
    } catch (error) {
      const node = document.querySelector("#preparation-message");
      node.className = "inline-message is-error";
      node.textContent = error.message;
    }
  });
  const flightPage = main.querySelector("[data-flight-trip-id]");
  flightPage?.addEventListener("change", async (event) => {
    if (!event.target.matches("[data-flight-check]")) return;
    const row = event.target.closest("[data-flight-item]");
    try {
      await flightCheckService.updateItem(flightPage.dataset.flightTripId, flightPage.dataset.flightCheckId, row.dataset.flightItem, event.target.checked);
      await refresh();
    } catch (error) { showFlightMessage(error.message, true); }
  });
  flightPage?.addEventListener("click", async (event) => {
    try {
      if (event.target.closest("[data-start-flight]")) {
        await flightCheckService.start(flightPage.dataset.flightTripId);
        await refresh();
      }
      if (event.target.closest("[data-complete-flight]")) {
        try {
          await flightCheckService.complete(flightPage.dataset.flightTripId, flightPage.dataset.flightCheckId);
        } catch (error) {
          if (error.code !== "INCOMPLETE_SETUP") throw error;
          if (!confirm(`${error.message}\n\nFortsæt til afgang?`)) return;
          await flightCheckService.complete(flightPage.dataset.flightTripId, flightPage.dataset.flightCheckId, { allowIncompleteSetup: true });
        }
        await refresh();
      }
    } catch (error) { showFlightMessage(error.message, true); }
  });
  if (!packingPage?.classList.contains("packing-page")) return;
  packingPage.addEventListener("change", async (event) => {
    const row = event.target.closest("[data-packing-item]");
    if (!row) return;
    try {
      if (event.target.matches("[data-pack-check]")) await tripService.updatePackingItem(packingPage.dataset.tripId, row.dataset.packingItem, { checked: event.target.checked });
      await refresh();
    } catch (error) { showPackingMessage(error.message, true); }
  });
  let quantitySaveTimer;
  packingPage.addEventListener("input", (event) => {
    if (!event.target.matches("[data-pack-quantity]")) return;
    const row = event.target.closest("[data-packing-item]");
    const value = event.target.value;
    clearTimeout(quantitySaveTimer);
    quantitySaveTimer = setTimeout(async () => {
      try {
        await tripService.updatePackingItem(packingPage.dataset.tripId, row.dataset.packingItem, { quantity: value });
        showPackingMessage("Antallet er gemt.");
      } catch (error) { showPackingMessage(error.message, true); }
    }, 300);
  });
  packingPage.addEventListener("click", async (event) => {
    if (event.target.closest("[data-add-trip-item]")) return addItemDialog();
    const removeButton = event.target.closest("[data-remove-pack]");
    if (!removeButton) return;
    const row = removeButton.closest("[data-packing-item]");
    if (!confirm("Fjern punktet fra denne tur? Masterdata ændres ikke.")) return;
    try {
      await tripService.updatePackingItem(packingPage.dataset.tripId, row.dataset.packingItem, { removed: true });
      await refresh();
    } catch (error) { showPackingMessage(error.message, true); }
  });

  const dialog = document.querySelector("#editor-dialog");
  dialog.onclick = (event) => { if (event.target.closest("[data-close-dialog]")) dialog.close(); };
  dialog.onsubmit = async (event) => {
    event.preventDefault();
    const form = event.target;
    if (!form.matches("[data-add-trip-item-form]")) return;
    const data = Object.fromEntries(new FormData(form));
    try {
      await tripService.addPackingItem(packingPage.dataset.tripId, data);
      dialog.close();
      await refresh();
    } catch (error) { showFormError(form, error.message); }
  };
}

function showPackingMessage(message, isError = false) {
  const node = document.querySelector("#packing-message");
  if (!node) return;
  node.className = isError ? "inline-message is-error" : "inline-message";
  node.textContent = message;
}

function showFlightMessage(message, isError = false) {
  const node = document.querySelector("#flight-message");
  if (!node) return;
  node.className = isError ? "inline-message is-error" : "inline-message";
  node.textContent = message;
}
