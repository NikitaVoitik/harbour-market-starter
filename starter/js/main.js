// The only file the HTML loads. It wires events to state and starts the page.
import { state, toggleSaved } from "./state.js";
import { save, load } from "./storage.js";
import { render } from "./render.js";
import { setupMenu } from "./menu.js";
import { setupTickets } from "./tickets.js";
import { getJSON, describe, canRetry } from "./api.js";
import queryString from "https://esm.sh/query-string@9.5.1?bundle";

const filters = document.querySelector(".filters");
const list = document.querySelector(".vendor-list");
const status = document.querySelector(".status");
let searchTimer;
let controller;
let requestId = 0;

function readSearchURL() {
  const params = queryString.parse(window.location.search);
  state.query = typeof params.q === "string" ? params.q : "";
  state.tag = typeof params.tag === "string" && params.tag ? params.tag : "all";
}

function searchParams() {
  return {
    q: state.query.trim() ? state.query : undefined,
    tag: state.tag !== "all" ? state.tag : undefined,
  };
}

function writeSearchURL() {
  const url = queryString.stringifyUrl({
    url: window.location.href,
    query: searchParams(),
  });
  if (url !== window.location.href) {
    window.history.pushState(null, "", url);
  }
}

// Invalidate immediately, even while the next search is waiting for its timer.
function cancelSearch() {
  clearTimeout(searchTimer);
  requestId += 1;
  controller?.abort();
}

function scheduleSearch(delay = 0) {
  cancelSearch();
  state.error = "";
  state.status = "loading";
  update();
  searchTimer = setTimeout(() => {
    loadStalls();
  }, delay);
}

document.querySelector(".retry").addEventListener("click", async () => {
  status.focus();
  await loadStalls();
});

// Every change goes through here: draw, then remember
function update() {
  render();
  save();
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.tag = button.dataset.filter;
  scheduleSearch();
});

document.querySelector("#vendor-search").addEventListener("input", (event) => {
  state.query = event.target.value;
  scheduleSearch(300);
});

window.addEventListener("popstate", () => {
  // Compare the whole search params, not q and tag one by one,
  // so a new filter only has to be added to searchParams() and readSearchURL()
  const before = queryString.stringify(searchParams());
  readSearchURL();
  if (queryString.stringify(searchParams()) === before) return;
  save();
  loadStalls();
});

// The cards are redrawn all the time: one listener on the list hears every ♡
list.addEventListener("click", (event) => {
  const button = event.target.closest(".save");
  if (!button) return;
  toggleSaved(button.closest(".stall").dataset.id);
  update();
});

async function loadStalls() {
  cancelSearch();
  const id = requestId;
  controller = new AbortController();
  const signal = controller.signal;
  const query = state.query;
  const path = queryString.stringifyUrl({ url: "/stalls", query: searchParams() });
  writeSearchURL();
  state.error = "";
  state.status = "loading";
  render();

  try {
    const response = await getJSON(path, { signal });
    if (id !== requestId) return;
    state.stalls = response;
    state.resultsQuery = query;
    state.hasLoaded = true;
    state.status = "success";
  } catch (error) {
    if (signal.aborted || id !== requestId || error.name === "AbortError") return;
    console.error(error);
    state.error = describe(error);
    state.canRetry = canRetry(error);
    state.status = "error";
  }

  render();
}

setupMenu();
setupTickets();
load();
readSearchURL();
await loadStalls();
