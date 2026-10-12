// Every request to the Harbour Market API goes through this module.
// The rest of the app imports these functions and never calls fetch() itself.
// The signatures are here; the bodies are yours (Lecture 8, Act 2).

// Your own market on the course server: put your GitHub username in the URL
// (lower case). The control page: https://harbour-api.lopin.me
export const API = "https://harbour-api.lopin.me/nikitavoitik/api";

// An Error for a 4xx/5xx response, carrying the status and the parsed error
// body, so callers can tell a 404 from a 422 and read body.fields.
export class HttpError extends Error {
  constructor(response, body) {
    super(`HTTP ${response.status} ${response.statusText}`);
    this.response = response;
    this.body = body;
    this.name = "HttpError";
    this.status = response.status;
  }
}

// One request, JSON in and out. `path` is relative to API: request("GET", "/stalls").
// Resolves with the parsed body (null for a 204); rejects with an HttpError
// for 4xx/5xx, and lets network errors and aborts through.
export async function request(method, path, data, options = {}) {
  const request = await fetch(API + path, {
    ...options,
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  if (request.status === 204) return null;

  const body = await request.json();

  if (!request.ok) {
    throw new HttpError(request, body);
  }

  return body;
}

export const getJSON = (path, options) =>
  request("GET", path, undefined, options);
export const postJSON = (path, data, options) =>
  request("POST", path, data, options);

// A short sentence for people; the error itself goes to the console.
export function describe(error) {
  // TODO: an HttpError → "the server answered 503", a TypeError → "no connection"
  if (error instanceof HttpError) {
    return `the server answered ${error.status}`;
  }
  if (error instanceof TypeError) {
    return "no connection";
  }

  return "something went wrong";
}
