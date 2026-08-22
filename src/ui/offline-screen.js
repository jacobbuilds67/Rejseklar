export async function renderOfflineScreen() {
  const serviceWorkerReady = "serviceWorker" in navigator;
  const installMode = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const persistent = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
  return `<section class="offline-page">
    <a class="back-link" href="#/settings">‹ Indstillinger</a>
    <h2>Installation og offline</h2><p class="section-intro">Rejseklar gemmer turdata lokalt og kræver ikke internet under normal brug.</p>
    <div class="offline-status-grid">
      <article><span class="status-dot ${navigator.onLine ? "is-online" : "is-offline"}"></span><div><strong>${navigator.onLine ? "Online" : "Offline"}</strong><small>Aktuel forbindelse</small></div></article>
      <article><span class="status-dot ${serviceWorkerReady ? "is-online" : "is-offline"}"></span><div><strong>${serviceWorkerReady ? "Offline-cache understøttes" : "Offline-cache understøttes ikke"}</strong><small>Denne browser</small></div></article>
      <article><span class="status-dot ${installMode ? "is-online" : ""}"></span><div><strong>${installMode ? "Åbnet som installeret app" : "Åbnet i browser"}</strong><small>Visningstilstand</small></div></article>
    </div>
    <article class="install-card"><h3>Installér på iPhone eller iPad</h3><ol><li>Åbn appens adresse i Safari.</li><li>Tryk på <strong>Del</strong>.</li><li>Vælg <strong>Føj til hjemmeskærm</strong>.</li><li>Åbn Rejseklar fra hjemmeskærmen, mens der er internet første gang.</li></ol></article>
    <article class="install-card"><h3>Beskyt lokal lagring</h3><p>${persistent ? "Browseren har givet Rejseklar vedvarende lagerplads." : "Browseren bestemmer normalt selv, hvor længe lokale data bevares. Regelmæssig backup anbefales altid."}</p>
      ${!persistent && navigator.storage?.persist ? `<button class="quiet-button" type="button" data-request-persistence>Anmod om vedvarende lagring</button>` : ""}</article>
    <div id="offline-message" aria-live="polite"></div>
    <p class="helper-text">En mistet forbindelse påvirker ikke en igangværende pakkeliste, klargøring eller Flight Check. Synkronisering mellem enheder er ikke en del af version 1.</p>
  </section>`;
}

export function bindOfflineEvents() {
  document.querySelector("[data-request-persistence]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    const message = document.querySelector("#offline-message");
    try {
      const granted = await navigator.storage.persist();
      message.className = granted ? "inline-message" : "inline-message is-error";
      message.textContent = granted
        ? "Browseren har givet vedvarende lagerplads. Brug stadig backup som ekstra sikkerhed."
        : "Browseren gav ikke vedvarende lagerplads. Dine data gemmes fortsat lokalt; lav regelmæssig backup.";
    } catch {
      message.className = "inline-message is-error";
      message.textContent = "Browseren kunne ikke behandle anmodningen. Dine eksisterende data er ikke ændret.";
    }
  });
}
