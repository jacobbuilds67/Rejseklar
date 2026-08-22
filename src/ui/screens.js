const screenContent = {
  settings: `
    <section>
      <h2 class="section-heading">Indstillinger</h2>
      <p class="section-intro">Administrér de masterdata, som nye ture bliver bygget af.</p>
      <div class="card-list">
        <a class="card settings-link" href="#/settings/people"><h3>Personer <span>›</span></h3><p>Personlige lister og individuelle pakkeregler.</p></a>
        <a class="card settings-link" href="#/settings/items"><h3>Checklistpunkter <span>›</span></h3><p>Pakning, klargøring og Flight Check som masterdata.</p></a>
        <a class="card settings-link" href="#/settings/categories"><h3>Kategorier <span>›</span></h3><p>Gruppering og rækkefølge for alle tre arbejdsgange.</p></a>
        <a class="card settings-link" href="#/settings/rules"><h3>Pakkeregler <span>›</span></h3><p>Forståelige regler til automatisk beregning af antal.</p></a>
        <a class="card settings-link" href="#/settings/backup"><h3>Backup og gendannelse <span>›</span></h3><p>Eksportér alle data, eller gendan en valideret backupfil.</p></a>
        <a class="card settings-link" href="#/settings/offline"><h3>Installation og offline <span>›</span></h3><p>Installationsvejledning, forbindelsesstatus og lokal databeskyttelse.</p></a>
      </div>
    </section>`
};

export function renderScreen(route) {
  const main = document.querySelector("#main-content");
  main.innerHTML = screenContent[route] ?? screenContent.settings;
  document.querySelectorAll("[data-route]").forEach((link) => {
    if (link.dataset.route === route) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

export function renderFatalError(message) {
  document.querySelector("#main-content").innerHTML = `
    <section class="error-panel" role="alert">
      <h2>Appen kunne ikke starte</h2>
      <p>${message}</p>
      <p>Dine eksisterende data er ikke blevet slettet.</p>
    </section>`;
}
