// api.js
// ─────────────────────────────────────────────
// All server communication lives here.
// This is called an "API module" or "service layer."
//
// WHY a separate file?
//   - if server URL changes, edit ONE file
//   - if you add error handling, edit ONE file
//   - game code stays clean — no fetch() scattered around
//   - easy to mock for testing later
//
// Every function here:
//   - calls one Flask endpoint
//   - returns the parsed response
//   - returns null if something goes wrong
//   - never crashes the game on failure
// ─────────────────────────────────────────────

// ── BASE URL ──────────────────────────────────
// Change this one line if your server moves.
// Nothing else needs to change.
const API_BASE = 'http://localhost:5000'


// ── INTERNAL HELPER ───────────────────────────
// All requests go through this function.
// It handles errors in one place so you don't
// repeat try/catch in every function below.
//
// options = standard fetch() options object
// e.g. { method: 'POST', body: JSON.stringify({...}) }
async function request(endpoint, options = {}) {
  try {

    const response = await fetch(`${API_BASE}${endpoint}`, {
      // default headers for all requests
      headers: { 'Content-Type': 'application/json' },

      // spread operator merges caller's options in
      // e.g. if caller passes method:'POST', body:'...'
      // those get added to the headers above
      ...options
    })

    // Parse the JSON response body
    const data = await response.json()

    // response.ok is true for status codes 200-299
    // HTTP errors (400, 404, 500) don't throw automatically
    // we have to check manually
    if (!response.ok) {
      console.error(
        `[API] Error ${response.status} on ${endpoint}:`,
        data.error || data
      )
      return null
    }

    return data

  } catch (error) {
    // This catches network errors:
    //   - server is offline
    //   - no internet connection
    //   - wrong URL
    console.error(`[API] Network error on ${endpoint}:`, error.message)
    return null   // return null so caller can check for failure
  }
}


// ─────────────────────────────────────────────
// PUBLIC FUNCTIONS
// These are what your game actually calls.
// Each one wraps one Flask endpoint.
// ─────────────────────────────────────────────


// ── FETCH ALL RULES ───────────────────────────
// Calls: GET /rules
// Used on startup to load server-side rules
//
// Usage:
//   const data = await fetchRules()
//   data.rules['red_light'].fine  → 1000
export async function fetchRules() {
  return await request('/rules')
}


// ── REPORT VIOLATION ─────────────────────────
// Calls: POST /violation
// Used when player breaks a traffic rule
//
// Usage:
//   const result = await reportViolation('red_light', 'player_1')
//   result.fine     → 1000
//   result.message  → 'Red Light Violation'
export async function reportViolation(type, playerId = 'player_1') {
  return await request('/violation', {
    method: 'POST',
    body:   JSON.stringify({
      type,              // shorthand for type: type
      player_id: playerId
    })
  })
}


// ── ASK AI ────────────────────────────────────
// Calls: POST /ask-ai
// Used for the AI explanation feature (Phase 6)
// For now returns stub response from Flask
//
// Usage:
//   const result = await askAI('What is the fine for speeding?')
//   result.answer  → 'The fine is ₹500...'
export async function askAI(question, context = '') {
  return await request('/ask-ai', {
    method: 'POST',
    body:   JSON.stringify({ question, context })
  })
}


// ── CHECK SERVER HEALTH ───────────────────────
// Calls: GET /
// Used on startup to check if server is online
//
// Usage:
//   const online = await checkHealth()
//   online  → true or false
export async function checkHealth() {
  const data = await request('/')
  return data !== null
}