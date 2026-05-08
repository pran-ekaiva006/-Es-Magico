/**
 * api.js — Frontend API layer for LeadFlow.
 *
 * All functions use fetch with relative URLs (proxied by Vite → localhost:3001).
 * Each function throws on non-2xx responses with the error message from the API.
 */

const BASE = "/api";

// ─── Internal helper ─────────────────────────────────────────────────────────

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  return body;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

/**
 * GET /api/leads
 * @param {string} [status] - Filter by lead status
 * @param {string} [search] - Search by lead name
 * @returns {Promise<Array>} Array of lead objects
 */
export async function getLeads(status, search) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  const qs = params.toString();
  return request(`${BASE}/leads${qs ? `?${qs}` : ""}`);
}

/**
 * POST /api/leads
 * @param {Object} data - { name, company?, phone?, status? }
 * @returns {Promise<Object>} The newly created lead
 */
export async function createLead(data) {
  return request(`${BASE}/leads`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PATCH /api/leads/:id/status
 * @param {string} id   - Lead UUID
 * @param {string} status - New status value
 * @returns {Promise<Object>} The updated lead
 */
export async function updateStatus(id, status) {
  return request(`${BASE}/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ─── Discussions ──────────────────────────────────────────────────────────────

/**
 * GET /api/leads/:id/discussions
 * @param {string} id - Lead UUID
 * @returns {Promise<Array>} Array of discussion objects (newest first)
 */
export async function getDiscussions(id) {
  return request(`${BASE}/leads/${id}/discussions`);
}

/**
 * POST /api/leads/:id/discussions
 * @param {string} id   - Lead UUID
 * @param {Object} data - { note, follow_up_date?, follow_up_time? }
 * @returns {Promise<Object>} The newly created discussion
 */
export async function addDiscussion(id, data) {
  return request(`${BASE}/leads/${id}/discussions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
