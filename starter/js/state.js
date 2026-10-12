

// Everything that can change, and nothing you can work out from it.
// Other modules can't reassign an imported const, but they can change its keys.
export const state = {
  tag: "all",       // the pressed filter button
  query: "",        // what's typed in the search box
  saved: new Set(), // ids of the ♥ stalls
  status: "idle",   // "idle", "loading", "success", "error"
  error: "",
  stalls: [],
  hasLoaded: false,
  resultsQuery: "", // the query used for the last successful results
};

// Derived, never stored: what should be on screen right now?
export function visibleStalls() {
  // Search and tag filtering now happen on the server, including blurbs.
  return state.stalls;
}

export function toggleSaved(id) {
  if (state.saved.has(id)) state.saved.delete(id);
  else state.saved.add(id);
}
