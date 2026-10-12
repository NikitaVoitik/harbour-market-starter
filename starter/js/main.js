// The only file the HTML loads. It wires events to state and starts the page.
import { state, toggleSaved } from "./state.js";
import { save, load } from "./storage.js";
import { render } from "./render.js";
import { setupMenu } from "./menu.js";
import { setupTickets } from "./tickets.js";
import { getJSON, describe } from "./api.js";

const filters = document.querySelector(".filters");
const list = document.querySelector(".vendor-list");

// Every change goes through here: draw, then remember
function update() {
  render();
  save();
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.tag = button.dataset.filter;
  update();
});

document.querySelector("#vendor-search").addEventListener("input", (event) => {
  state.query = event.target.value;
  update();
});

// The cards are redrawn all the time: one listener on the list hears every ♡
list.addEventListener("click", (event) => {
  const button = event.target.closest(".save");
  if (!button) return;
  toggleSaved(button.closest(".stall").dataset.id);
  update();
});

async function loadStalls() {
  state.status = "loading";
  render();

  try {
    const response = await getJSON("/stalls");
    state.stalls = response;
    state.status = "success";
  } catch (error) {
    state.error = describe(error);
    state.status = "error";
  }

  render();
}

setupMenu();
setupTickets();
load();
await loadStalls();
