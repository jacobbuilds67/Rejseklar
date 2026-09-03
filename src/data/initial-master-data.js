const now = "2026-08-21T00:00:00.000Z";

const record = (id, extra) => ({ id, createdAt: now, updatedAt: now, revision: 1, ...extra });

export const initialCategories = [
  record("cat-pack-kitchen", { name: "Køkken og bad", scope: "packing", sortOrder: 10, active: true }),
  record("cat-pack-living", { name: "Opholdsrum", scope: "packing", sortOrder: 20, active: true }),
  record("cat-pack-storage", { name: "Under senge og sofaer", scope: "packing", sortOrder: 30, active: true }),
  record("cat-pack-technical", { name: "Campingvogn og teknik", scope: "packing", sortOrder: 40, active: true }),
  record("cat-pack-front", { name: "Forrum", scope: "packing", sortOrder: 50, active: true }),
  record("cat-pack-luggage", { name: "Campingvognens bagagerum", scope: "packing", sortOrder: 60, active: true }),
  record("cat-pack-awning", { name: "Fortelt", scope: "packing", sortOrder: 70, active: true }),
  record("cat-pack-misc", { name: "Diverse udstyr og dokumenter", scope: "packing", sortOrder: 80, active: true }),
  record("cat-pack-clothes", { name: "Tøj og fodtøj", scope: "packing", sortOrder: 90, active: true }),
  record("cat-pack-tent", { name: "Teltudstyr", scope: "packing", sortOrder: 100, active: true }),
  record("cat-prep-systems", { name: "Installationer", scope: "preparation", sortOrder: 10, active: true }),
  record("cat-prep-vehicle", { name: "Campingvogn", scope: "preparation", sortOrder: 20, active: true }),
  record("cat-prep-equipment", { name: "Udstyr", scope: "preparation", sortOrder: 30, active: true }),
  record("cat-flight-inside", { name: "Indvendig kontrol", scope: "flightCheck", sortOrder: 10, active: true }),
  record("cat-flight-outside", { name: "Udvendig kontrol", scope: "flightCheck", sortOrder: 20, active: true }),
  record("cat-flight-hitch", { name: "Tilkobling og kørsel", scope: "flightCheck", sortOrder: 30, active: true })
];

export const initialPackingRules = [
  record("rule-fixed-one", { name: "Fast antal: 1", kind: "fixed", value: 1, rounding: "ceil", minimum: 0, active: true }),
  record("rule-per-day", { name: "Én pr. rejsedag", kind: "perDay", value: 1, rounding: "ceil", minimum: 0, active: true }),
  record("rule-per-two-days", { name: "Én pr. 2 dage", kind: "perPeriod", value: 2, rounding: "ceil", minimum: 0, active: true }),
  record("rule-per-three-days", { name: "Én pr. 3 dage", kind: "perPeriod", value: 3, rounding: "ceil", minimum: 0, active: true }),
  record("rule-per-four-days", { name: "Én pr. 4 dage", kind: "perPeriod", value: 4, rounding: "ceil", minimum: 0, active: true }),
  record("rule-days-plus-one", { name: "Antal dage + 1", kind: "daysPlus", extra: 1, rounding: "ceil", minimum: 0, active: true }),
  record("rule-per-person", { name: "Én pr. valgt person", kind: "perSelectedPerson", rounding: "ceil", minimum: 0, active: true }),
  record("rule-manual", { name: "Manuel mængde", kind: "manual", rounding: "ceil", minimum: 0, active: true })
];

const packing = (id, categoryId, title, options = {}) => record(`pdf-${id}`, {
  scope: "packing", categoryId, title, description: "", inclusionType: "always", personId: null,
  quantityMode: "fixed", fixedQuantity: 1, packingRuleId: null, unit: "stk.", sortOrder: id,
  active: true, sourceReference: `Checkliste CV_20052023.pdf, punkt ${id}`, ...options
});

const optional = { inclusionType: "optional" };

export const initialMasterItems = [
  packing(1, "cat-pack-kitchen", "Instantkaffe"),
  packing(2, "cat-pack-kitchen", "Salt, peber og øvrige krydderier"),
  packing(3, "cat-pack-kitchen", "Kaffe"),
  packing(4, "cat-pack-kitchen", "Opvaskebørste"),
  packing(5, "cat-pack-kitchen", "Opvaskebalje"),
  packing(6, "cat-pack-kitchen", "Opvaskemiddel"),
  packing(7, "cat-pack-kitchen", "Viskestykker"),
  packing(8, "cat-pack-kitchen", "Karklude"),
  packing(9, "cat-pack-kitchen", "Køkkenrulle"),
  packing(10, "cat-pack-kitchen", "Toiletpapir"),
  packing(11, "cat-pack-kitchen", "Glas til alle", { quantityMode: "rule", packingRuleId: "rule-per-person" }),
  packing(12, "cat-pack-kitchen", "Kogekedel"),
  packing(13, "cat-pack-kitchen", "Termokande"),
  packing(14, "cat-pack-kitchen", "Kaffefiltre"),
  packing(15, "cat-pack-kitchen", "Toiletsager"),
  packing(16, "cat-pack-technical", "Fjernbetjening til mover"),
  packing(17, "cat-pack-living", "TV", optional),
  packing(18, "cat-pack-living", "Tæpper"),
  packing(19, "cat-pack-living", "Terninger", optional),
  packing(20, "cat-pack-living", "Backgammon", optional),
  packing(21, "cat-pack-living", "Spillekort", optional),
  packing(22, "cat-pack-living", "Bose Bluetooth-højttaler", optional),
  packing(23, "cat-pack-kitchen", "Kaffemaskine", optional),
  packing(24, "cat-pack-storage", "Kogeplade", optional),
  packing(25, "cat-pack-storage", "Campingstole", { quantityMode: "rule", packingRuleId: "rule-per-person" }),
  packing(26, "cat-pack-storage", "Bord"),
  packing(27, "cat-pack-storage", "Foldeskabe til fortelt", { ...optional, fixedQuantity: 2 }),
  packing(28, "cat-pack-storage", "Toiletkemi"),
  packing(29, "cat-pack-storage", "Adapter til strømkabel"),
  packing(30, "cat-pack-storage", "Ovn", optional),
  packing(31, "cat-pack-storage", "Elkasse"),
  packing(32, "cat-pack-storage", "Støvsuger", optional),
  packing(33, "cat-pack-storage", "Fryseposer"),
  packing(34, "cat-pack-storage", "Alufolie/sølvpapir"),
  packing(35, "cat-pack-front", "Gasflaske(r)"),
  packing(36, "cat-pack-front", "Gummihammer"),
  packing(37, "cat-pack-front", "Bardunkasse"),
  packing(38, "cat-pack-front", "Pløkkekasse"),
  packing(39, "cat-pack-front", "Godt at have-kassen"),
  packing(40, "cat-pack-front", "Håndtag til støtteben"),
  packing(41, "cat-pack-front", "Håndtag til mover"),
  packing(42, "cat-pack-front", "Spildevandstank"),
  packing(43, "cat-pack-front", "Rør til spildevandstank"),
  packing(44, "cat-pack-front", "Stormstropper", optional),
  packing(45, "cat-pack-front", "Presenninger", optional),
  packing(46, "cat-pack-luggage", "Tæppe til markise", optional),
  packing(47, "cat-pack-luggage", "Overtræk til cykler", optional),
  packing(48, "cat-pack-luggage", "Strømkabel, 25 m"),
  packing(49, "cat-pack-luggage", "Strømkabel, 10 m"),
  packing(50, "cat-pack-luggage", "Kabelrulle"),
  packing(51, "cat-pack-luggage", "Vandkande"),
  packing(52, "cat-pack-luggage", "Paraply-tørrestativ", optional),
  packing(53, "cat-pack-awning", "Fortelt", optional),
  packing(54, "cat-pack-awning", "Tæppe til fortelt", optional),
  packing(55, "cat-pack-awning", "Presenning til fortelt", optional),
  packing(56, "cat-pack-awning", "Stænger til fortelt", optional),
  packing(57, "cat-pack-awning", "Lys og elkasse til fortelt", optional),
  packing(58, "cat-pack-misc", "AAA-batterier til moverens fjernbetjening"),
  packing(59, "cat-pack-misc", "Drone", optional),
  packing(60, "cat-pack-misc", "DJI Mimo", optional),
  packing(61, "cat-pack-misc", "SD-kort", optional),
  packing(62, "cat-pack-misc", "iPads", optional),
  packing(63, "cat-pack-misc", "MacBook", optional),
  packing(64, "cat-pack-misc", "Pas", optional),
  packing(65, "cat-pack-misc", "Kort over destinationen", optional),
  packing(66, "cat-pack-misc", "NAF-bøger", optional),
  packing(79, "cat-pack-tent", "Firepersonerstelt", { ...optional, active: false }),
  packing(80, "cat-pack-tent", "Soveposer", { ...optional, quantityMode: "rule", packingRuleId: "rule-per-person", active: false }),
  packing(81, "cat-pack-tent", "Luftmadrasser", { ...optional, quantityMode: "rule", packingRuleId: "rule-per-person", active: false }),
  packing(82, "cat-pack-tent", "Presenning til telt", { ...optional, active: false }),
  packing(83, "cat-pack-tent", "Liggeunderlag", { ...optional, quantityMode: "rule", packingRuleId: "rule-per-person", active: false }),
  packing(84, "cat-pack-tent", "Pumpe til luftmadras", { ...optional, active: false }),

  record("equipment-cycles", {
    scope: "packing", categoryId: "cat-pack-luggage", title: "Cykler medbringes", description: "Aktiverer de cykelrelaterede punkter i Flight Check.",
    inclusionType: "optional", personId: null, quantityMode: "none", fixedQuantity: null,
    packingRuleId: null, unit: "", sortOrder: 47.5, active: true, sourceReference: "Appens udstyrsvalg"
  }),

  ...[
    ["prep-gas", "cat-prep-systems", "Kontrollér gasniveau"],
    ["prep-toilet", "cat-prep-systems", "Klargør toilet og toiletkemi"],
    ["prep-power", "cat-prep-systems", "Kontrollér 12 V- og 230 V-strøm"],
    ["prep-water", "cat-prep-systems", "Kontrollér vandinstallationen"],
    ["prep-condition", "cat-prep-vehicle", "Kontrollér campingvognens dæk og synlige skader"],
    ["prep-install", "cat-prep-equipment", "Montér valgt udstyr"],
    ["prep-mover", "cat-prep-equipment", "Kontrollér mover og fjernbetjening"],
    ["prep-cables", "cat-prep-equipment", "Kontrollér nødvendige kabler og adaptere"],
    ["prep-fresh-water", "cat-prep-systems", "Fyld eller klargør friskvand efter behov"],
    ["prep-emergency", "cat-prep-equipment", "Kontrollér førstehjælps- og nødudstyr"]
  ].map(([id, categoryId, title], index) => record(id, {
    scope: "preparation", categoryId, title, description: "Nyt standardpunkt tilføjet i appens analysefase.",
    inclusionType: "always", personId: null, quantityMode: "none", fixedQuantity: null,
    packingRuleId: null, unit: "", sortOrder: index + 1, active: true, sourceReference: "Appens godkendte klargøringsliste"
  })),

  ...[
    [85, "cat-flight-inside", "Ingen tunge ting i overskabene"],
    [86, "cat-flight-inside", "Skufferne er låst"],
    [87, "cat-flight-inside", "Bordet er slået ned", null, false],
    [88, "cat-flight-inside", "Ingen løse genstande"],
    [89, "cat-flight-outside", "Gassen er lukket"],
    [90, "cat-flight-inside", "Vinduerne er lukket"],
    [91, "cat-flight-outside", "Antennen er taget ned"],
    [92, "cat-flight-outside", "Vandtanken er højst halvt fuld"],
    [93, "cat-flight-outside", "Cykelstativet er låst", "equipment-cycles"],
    [94, "cat-flight-outside", "Cyklerne er fastspændt korrekt", "equipment-cycles"],
    [95, "cat-flight-hitch", "Trækkugle og træktøj er rengjort efter producentens anvisninger"],
    [96, "cat-flight-hitch", "Kugletrykket er kontrolleret"],
    [97, "cat-flight-outside", "Dæktrykket er kontrolleret"],
    [98, "cat-flight-outside", "Moveren er frakoblet"],
    [99, "cat-flight-outside", "Alle støtteben er hævet"],
    [100, "cat-flight-hitch", "Lygterne virker"],
    [101, "cat-flight-hitch", "Spejlene er korrekt monteret og indstillet"],
    [102, "cat-flight-hitch", "Træktøjet er fastgjort korrekt"]
  ].map(([id, categoryId, title, conditionId, active = true]) => record(`pdf-${id}`, {
    scope: "flightCheck", categoryId, title, description: "", inclusionType: "always", personId: null,
    quantityMode: "none", fixedQuantity: null, packingRuleId: null, unit: "", sortOrder: id,
    active, sourceReference: `Checkliste CV_20052023.pdf, punkt ${id}`,
    activationCondition: conditionId ? { kind: "selectedEquipment", referencedMasterItemId: conditionId } : null
  }))
];

export const initialPersonItemTemplates = [
  [67, "Trøjer", "rule-per-three-days"],
  [68, "Regntøj", "rule-fixed-one"],
  [69, "Håndklæder", "rule-fixed-one"],
  [70, "Lange bukser", "rule-per-four-days"],
  [71, "Korte bukser", "rule-per-four-days"],
  [72, "Strømper", "rule-days-plus-one"],
  [73, "Undertøj", "rule-days-plus-one"],
  [74, "T-shirts", "rule-per-day"],
  [75, "Badetøj", "rule-fixed-one"],
  [76, "Sandaler", "rule-fixed-one"],
  [77, "Træsko", "rule-fixed-one"],
  [78, "Gummistøvler", "rule-fixed-one"]
].map(([id, title, packingRuleId], index) => record(`template-pdf-${id}`, {
  title, categoryId: "cat-pack-clothes", packingRuleId, unit: "stk.", sortOrder: index + 1,
  active: true, sourceReference: `Checkliste CV_20052023.pdf, punkt ${id}`
}));

export const seedSummary = Object.freeze({
  pdfPackingItems: initialMasterItems.filter((item) => item.sourceReference?.startsWith("Checkliste") && item.scope === "packing").length,
  pdfPersonTemplates: initialPersonItemTemplates.length,
  pdfFlightItems: initialMasterItems.filter((item) => item.sourceReference?.startsWith("Checkliste") && item.scope === "flightCheck").length,
  preparationItems: initialMasterItems.filter((item) => item.scope === "preparation").length
});
