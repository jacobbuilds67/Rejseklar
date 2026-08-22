export function calculateQuantity(rule, { days, selectedPeople = 0 } = {}) {
  const duration = Math.max(0, Number(days) || 0);
  switch (rule.kind) {
    case "fixed": return Math.ceil(Number(rule.value) || 0);
    case "perDay": return Math.ceil(duration * (Number(rule.value) || 0));
    case "perPeriod": return Math.ceil(duration / Math.max(1, Number(rule.value) || 1));
    case "daysPlus": return Math.ceil(duration + (Number(rule.extra) || 0));
    case "perSelectedPerson": return Math.max(0, Math.ceil(Number(selectedPeople) || 0));
    case "manual": return null;
    default: throw new Error("Ukendt pakkeregel.");
  }
}
