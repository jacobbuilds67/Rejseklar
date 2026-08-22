export function setStorageStatus(state, label) {
  const element = document.querySelector("#storage-status");
  element.dataset.state = state;
  element.textContent = label;
}
