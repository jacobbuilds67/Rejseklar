import { tripService } from "../domain/trip-service.js";
import { escapeHtml } from "./html.js";

const dateFormatter = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("da-DK", { dateStyle: "long", timeStyle: "short" });

function formatDate(date) {
  return date ? dateFormatter.format(new Date(`${date}T12:00:00`)) : "Dato mangler";
}

function formatDateTime(date) {
  return date ? dateTimeFormatter.format(new Date(date)) : "Tidspunkt mangler";
}

function progress(items = []) {
  const active = items.filter((item) => !item.removed);
  const completed = active.filter((item) => item.checked ?? item.completed).length;
  return { completed, total: active.length, percent: active.length ? Math.round(completed / active.length * 100) : 0 };
}

function historyList(trips) {
  if (!trips.length) return `<section><h2 class="section-heading">Historik</h2><p class="section-intro">Afsluttede ture gemmes her som read-only snapshots.</p>
    <div class="empty-card"><p>Der er endnu ingen afsluttede ture.</p></div></section>`;
  return `<section><h2 class="section-heading">Historik</h2><p class="section-intro">Afsluttede ture kan ses, men ikke ændres.</p>
    <div class="history-list">${trips.map((trip) => {
      const checks = (trip.flightChecks ?? []).filter((check) => check.status === "completed").length;
      return `<a class="history-card" href="#/history/${trip.id}"><div><h3>${escapeHtml(trip.name)}</h3><p>${formatDate(trip.departureDate)} · ${trip.durationDays} ${trip.durationDays === 1 ? "dag" : "dage"}</p></div>
        <span>${checks} ${checks === 1 ? "Flight Check" : "Flight Checks"} ›</span></a>`;
    }).join("")}</div></section>`;
}

function snapshotItem(item, stateKey) {
  const complete = Boolean(item[stateKey]);
  return `<li class="snapshot-item${complete ? " is-complete" : ""}"><span>${complete ? "✓" : "○"}</span><div><strong>${escapeHtml(item.title)}</strong>
    ${item.personSnapshot ? `<small>${escapeHtml(item.personSnapshot.name)}</small>` : ""}
    ${item.quantity !== null && item.quantity !== undefined ? `<small>Antal: ${item.quantity} ${escapeHtml(item.unit || "")}</small>` : ""}</div></li>`;
}

function groupedSnapshot(items, stateKey) {
  const visible = (items ?? []).filter((item) => !item.removed);
  const groups = new Map();
  visible.forEach((item) => {
    const category = item.categorySnapshot?.name ?? "Ukendt kategori";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  });
  return [...groups.entries()].map(([category, entries]) => `<section class="snapshot-group"><h4>${escapeHtml(category)}</h4><ul>${entries.map((item) => snapshotItem(item, stateKey)).join("")}</ul></section>`).join("");
}

function flightChecksSnapshot(checks = []) {
  const completed = checks.filter((check) => check.status === "completed").sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  if (!completed.length) return `<p>Ingen gennemførte Flight Checks.</p>`;
  return completed.map((check) => `<details class="history-details flight-history-detail"><summary><span>Flight Check ${check.sequenceNumber}</span><strong>✓ ${check.completedItemCount} af ${check.totalItemCount}</strong><small>${formatDateTime(check.completedAt)}</small></summary>
    <div class="details-content">${groupedSnapshot(check.items, "completed")}</div></details>`).join("");
}

function tripDetails(trip) {
  const packing = progress(trip.packingItems);
  const preparation = progress(trip.preparationItems);
  const participants = trip.participantSnapshots?.map((person) => person.name).join(", ") || "Ingen deltagere registreret";
  const checks = (trip.flightChecks ?? []).filter((check) => check.status === "completed");
  return `<section class="history-detail">
    <a class="back-link" href="#/history">‹ Historik</a>
    <div class="history-heading"><p class="eyebrow" style="color: var(--color-accent)">Afsluttet tur</p><h2>${escapeHtml(trip.name)}</h2>
      <p>${formatDate(trip.departureDate)} · ${trip.durationDays} ${trip.durationDays === 1 ? "dag" : "dage"}</p><p>${escapeHtml(participants)}</p></div>
    <div class="history-stats">
      <article><strong>${packing.completed}/${packing.total}</strong><span>Pakket</span></article>
      <article><strong>${preparation.completed}/${preparation.total}</strong><span>Klargjort</span></article>
      <article><strong>${checks.length}</strong><span>Flight Checks</span></article>
    </div>
    <details class="history-details"><summary><span>Pakning</span><strong>${packing.percent} %</strong></summary><div class="details-content">${groupedSnapshot(trip.packingItems, "checked")}</div></details>
    <details class="history-details"><summary><span>Klargøring</span><strong>${preparation.percent} %</strong></summary><div class="details-content">${groupedSnapshot(trip.preparationItems, "checked")}</div></details>
    <section class="history-flight-section"><h3>Flight Checks</h3>${flightChecksSnapshot(trip.flightChecks)}</section>
    <p class="history-locked-note">🔒 Historikken er låst og beskyttet mod ændringer.</p>
  </section>`;
}

export async function renderHistorySection(tripId) {
  if (!tripId) return historyList(await tripService.listCompletedTrips());
  const trip = await tripService.getTrip(tripId);
  if (!trip || trip.status !== "completed") return `<section><a class="back-link" href="#/history">‹ Historik</a><div class="error-panel"><h2>Turen blev ikke fundet</h2><p>Den kan være slettet eller endnu ikke afsluttet.</p></div></section>`;
  return tripDetails(trip);
}
