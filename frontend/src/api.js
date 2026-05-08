/**
 * api.js — Centralised API helpers for the LeadFlow frontend.
 *
 * All functions return parsed JSON. Errors are thrown so callers
 * can handle them in try/catch or .catch() blocks.
 *
 * The Vite dev proxy forwards /api → http://localhost:3001,
 * so we use relative paths everywhere.
 */

const BASE = "/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const body = await res.json();

  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return body;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

/** Fetch all leads. Supports optional { status, search } filters. */
export function getLeads({ status, search } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  const qs = params.toString();
  return request(`${BASE}/leads${qs ? `?${qs}` : ""}`);
}

/** Create a new lead. */
export function createLead(data) {
  return request(`${BASE}/leads`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Update a lead's status. */
export function updateLeadStatus(id, status) {
  return request(`${BASE}/leads/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ─── Discussions ──────────────────────────────────────────────────────────────

/** Fetch all discussions for a given lead. */
export function getDiscussions(leadId) {
  return request(`${BASE}/leads/${leadId}/discussions`);
}

/** Add a discussion (with optional follow-up date sync). */
export function addDiscussion(leadId, data) {
  return request(`${BASE}/leads/${leadId}/discussions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
