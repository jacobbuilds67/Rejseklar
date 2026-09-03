import { SCHEMA_VERSION, STORE_NAMES } from "./config.js";
import { startRouter } from "./router.js";
import { openDatabase } from "./storage/database.js";
import { createRepository } from "./storage/repositories.js";
import { seedInitialData } from "./data/seed-service.js";
import { renderFatalError, renderScreen } from "./ui/screens.js";
import { bindSettingsEvents, renderSettingsSection } from "./ui/settings-screen.js";
import { bindTripEvents, renderCurrentSection } from "./ui/trip-screen.js";
import { renderHistorySection } from "./ui/history-screen.js";
import { bindBackupEvents, renderBackupScreen } from "./ui/backup-screen.js";
import { bindOfflineEvents, renderOfflineScreen } from "./ui/offline-screen.js";
import { setStorageStatus } from "./ui/notifications.js";

async function ensureSettings() {
  const settings = createRepository(STORE_NAMES.settings);
  let metadata = await settings.get("app");
  if (!metadata) {
    metadata = {
      id: "app",
      schemaVersion: SCHEMA_VERSION,
      seedDataVersion: 0,
      activeTripId: null,
      locale: "da-DK",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await settings.put(metadata);
  }
  try {
    await seedInitialData(metadata);
    return null;
  } catch (error) {
    if ((metadata.seedDataVersion ?? 0) === 0) throw error;
    console.error("Masterdataopdateringen kunne ikke gennemføres.", error);
    return "Dine data er åbnet, men opdateringen af standardpunkter afventer.";
  }
}

let activeLocation;

async function renderRoute(location) {
  activeLocation = location;
  if (location.route === "current") {
    document.querySelector("#main-content").innerHTML = await renderCurrentSection(location.section);
    document.querySelectorAll("[data-route]").forEach((link) => link.toggleAttribute("aria-current", link.dataset.route === "current"));
    bindTripEvents(() => renderRoute(activeLocation));
    return;
  }
  if (location.route === "history") {
    document.querySelector("#main-content").innerHTML = await renderHistorySection(location.section);
    document.querySelectorAll("[data-route]").forEach((link) => link.toggleAttribute("aria-current", link.dataset.route === "history"));
    return;
  }
  if (location.route === "settings" && location.section) {
    if (location.section === "offline") {
      document.querySelector("#main-content").innerHTML = await renderOfflineScreen();
      document.querySelectorAll("[data-route]").forEach((link) => link.toggleAttribute("aria-current", link.dataset.route === "settings"));
      bindOfflineEvents();
      return;
    }
    if (location.section === "backup") {
      document.querySelector("#main-content").innerHTML = renderBackupScreen();
      document.querySelectorAll("[data-route]").forEach((link) => link.toggleAttribute("aria-current", link.dataset.route === "settings"));
      bindBackupEvents();
      return;
    }
    const html = await renderSettingsSection(location.section, location.params);
    if (html) {
      document.querySelector("#main-content").innerHTML = html;
      document.querySelectorAll("[data-route]").forEach((link) => link.toggleAttribute("aria-current", link.dataset.route === "settings"));
      bindSettingsEvents(() => renderRoute(activeLocation));
      return;
    }
  }
  renderScreen(location.route);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
  const showUpdate = (worker) => {
    const banner = document.querySelector("#update-banner");
    banner.hidden = false;
    banner.querySelector("[data-apply-update]").onclick = () => worker.postMessage({ type: "SKIP_WAITING" });
  };
  if (registration.waiting) showUpdate(registration.waiting);
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) showUpdate(worker);
    });
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

function updateConnectionStatus() {
  setStorageStatus("ready", navigator.onLine ? "Gemt lokalt" : "Offline · gemmer lokalt");
}

async function startApp() {
  try {
    await openDatabase();
    const startupWarning = await ensureSettings();
    startRouter((location) => renderRoute(location).catch((error) => {
      console.error(error);
      renderFatalError("Skærmen kunne ikke indlæses. Dine eksisterende data er ikke blevet slettet.");
    }));
    setStorageStatus("ready", startupWarning ? "Data åbnet · opdatering afventer" : "Gemt lokalt");
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);
    registerServiceWorker().catch(() => {
      setStorageStatus("ready", "Lokal lagring klar");
    });
  } catch (error) {
    console.error(error);
    setStorageStatus("error", "Lagringsfejl");
    renderFatalError("Den lokale lagring kunne ikke åbnes. Genstart appen, og prøv igen.");
  }
}

startApp();
