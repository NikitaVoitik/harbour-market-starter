// The only file the HTML loads. It wires events to state and starts the page.
import { state, toggleSaved } from "./state.js";
import { save, load } from "./storage.js";
import { render } from "./render.js";
import { setupMenu } from "./menu.js";
import { setupTickets } from "./tickets.js";
import { getJSON, describe, canRetry } from "./api.js";

const filters = document.querySelector(".filters");
const list = document.querySelector(".vendor-list");
const status = document.querySelector(".status");
let searchTimer;
let controller;
let requestId = 0;

function readSearchURL() {
  const params = new URLSearchParams(window.location.search);
  state.query = params.get("q") ?? "";
  state.tag = params.get("tag") || "all";
}

// Only the filters in use: an empty one would end up in the URL as "q="
function searchParams() {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query);
  if (state.tag !== "all") params.set("tag", state.tag);
  return params;
}

function writeSearchURL() {
  const url = new URL(window.location.href); // keeps the #hash
  url.search = searchParams();
  if (url.href !== window.location.href) {
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
  const before = searchParams().toString();
  readSearchURL();
  if (searchParams().toString() === before) return;
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
  const search = searchParams().toString();
  const path = search ? `/stalls?${search}` : "/stalls";
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
