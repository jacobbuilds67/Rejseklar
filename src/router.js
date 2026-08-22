const VALID_ROUTES = new Set(["current", "history", "settings"]);

export function currentRoute() {
  const [path, query = ""] = location.hash.replace(/^#\//, "").split("?");
  const segments = path.split("/").filter(Boolean);
  const route = VALID_ROUTES.has(segments[0]) ? segments[0] : "current";
  return { route, section: segments[1] ?? null, params: new URLSearchParams(query) };
}

export function startRouter(render) {
  const update = () => render(currentRoute());
  window.addEventListener("hashchange", update);
  if (!location.hash) history.replaceState(null, "", "#/current");
  update();
  return () => window.removeEventListener("hashchange", update);
}
