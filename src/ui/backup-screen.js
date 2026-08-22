import { backupFilename, createBackup, downloadBackup, restoreBackup, validateBackup } from "../backup/backup-service.js";

let pendingBackup = null;

export function renderBackupScreen() {
  pendingBackup = null;
  return `<section class="backup-page">
    <a class="back-link" href="#/settings">‹ Indstillinger</a>
    <h2>Backup og gendannelse</h2>
    <p class="section-intro">Backupfilen indeholder alle personer, masterdata, indstillinger, ture og Flight Checks.</p>
    <article class="backup-card"><div><h3>Eksporter backup</h3><p>Download en JSON-fil, som kan gemmes eller flyttes til en anden enhed.</p></div>
      <button class="small-primary-button" type="button" data-export-backup>Eksporter backup</button></article>
    <article class="backup-card"><div><h3>Importer backup</h3><p>Filen valideres fuldt ud, før du får mulighed for at erstatte de nuværende data.</p></div>
      <label class="file-button">Vælg backupfil<input type="file" accept="application/json,.json" data-backup-file></label></article>
    <div id="backup-message" aria-live="polite"></div>
    <section id="backup-preview" class="backup-preview" hidden></section>
  </section>`;
}

function showMessage(message, isError = false) {
  const node = document.querySelector("#backup-message");
  node.className = isError ? "inline-message is-error" : "inline-message";
  node.textContent = message;
}

function showPreview(summary, backup) {
  const preview = document.querySelector("#backup-preview");
  preview.hidden = false;
  preview.innerHTML = `<h3>Backupfilen er gyldig</h3><p>Eksporteret ${new Intl.DateTimeFormat("da-DK", { dateStyle: "long", timeStyle: "short" }).format(new Date(backup.exportedAt))}</p>
    <dl><div><dt>Personer</dt><dd>${summary.people}</dd></div><div><dt>Masterpunkter</dt><dd>${summary.masterItems}</dd></div>
      <div><dt>Aktive ture</dt><dd>${summary.activeTrips}</dd></div><div><dt>Afsluttede ture</dt><dd>${summary.completedTrips}</dd></div>
      <div><dt>Flight Checks</dt><dd>${summary.flightChecks}</dd></div></dl>
    <div class="restore-warning"><strong>Advarsel</strong><p>Gendannelse erstatter alle nuværende data. Før det sker, downloader appen automatisk en sikkerhedsbackup af de nuværende data.</p></div>
    <button class="danger-outline-button" type="button" data-restore-backup>Erstat alle data med denne backup</button>`;
}

export function bindBackupEvents() {
  document.querySelector("[data-export-backup]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Opretter backup…";
    try {
      const backup = await createBackup();
      downloadBackup(backup);
      showMessage("Backupfilen er oprettet og downloadet.");
    } catch (error) { showMessage(`Backup kunne ikke oprettes: ${error.message}`, true); }
    finally { button.disabled = false; button.textContent = "Eksporter backup"; }
  });

  document.querySelector("[data-backup-file]")?.addEventListener("change", async (event) => {
    pendingBackup = null;
    document.querySelector("#backup-preview").hidden = true;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const summary = await validateBackup(parsed);
      pendingBackup = parsed;
      showMessage(`Filen '${file.name}' er valideret.`);
      showPreview(summary, parsed);
    } catch (error) { showMessage(`Backupfilen kan ikke bruges: ${error.message}`, true); }
  });

  document.querySelector("#backup-preview")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-restore-backup]");
    if (!button || !pendingBackup) return;
    if (!confirm("Alle nuværende data bliver erstattet. Vil du fortsætte?")) return;
    button.disabled = true;
    button.textContent = "Gendanner…";
    try {
      const safetyBackup = await createBackup();
      downloadBackup(safetyBackup, backupFilename("rejseklar-sikkerhedsbackup"));
      await restoreBackup(pendingBackup);
      location.hash = "#/settings/backup";
      location.reload();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Erstat alle data med denne backup";
      showMessage(`Gendannelsen blev ikke gennemført: ${error.message}. De eksisterende data er bevaret.`, true);
    }
  });
}
