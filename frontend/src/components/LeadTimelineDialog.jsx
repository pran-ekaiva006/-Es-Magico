import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { getDiscussions, addDiscussion, updateStatus } from "../api";
import "./LeadTimelineDialog.css";

const STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];

export default function LeadTimelineDialog({ lead, onClose, onUpdated, onOptimisticStatus, onError }) {
  const [discussions, setDiscussions] = useState([]);
  const [status, setStatus] = useState(lead.status);
  const [loading, setLoading] = useState(true);

  // Note form state
  const [note, setNote] = useState("");
  const [setFollowUp, setSetFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch discussions ──────────────────────────────────────────────────────

  const fetchDiscussions = useCallback(async () => {
    try {
      const data = await getDiscussions(lead.id);
      setDiscussions(data);
    } catch (err) {
      console.error("Failed to fetch discussions:", err);
    } finally {
      setLoading(false);
    }
  }, [lead.id]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  // ── Status change ──────────────────────────────────────────────────────────

  async function handleStatusChange(e) {
    const newStatus = e.target.value;
    const prevStatus = status;
    setStatus(newStatus);

    // Optimistic: immediately update badge in parent lead list
    if (onOptimisticStatus) onOptimisticStatus(lead.id, newStatus);

    try {
      await updateStatus(lead.id, newStatus);
      onUpdated();
    } catch (err) {
      // Rollback local + parent
      setStatus(prevStatus);
      if (onOptimisticStatus) onOptimisticStatus(lead.id, prevStatus);
      if (onError) onError(err.message || "Failed to update status");
    }
  }

  // ── Save note ──────────────────────────────────────────────────────────────

  async function handleSaveNote(e) {
    e.preventDefault();

    if (!note.trim()) {
      setError("Note cannot be empty");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const payload = { note: note.trim() };
      if (setFollowUp && followUpDate) {
        payload.follow_up_date = followUpDate;
        payload.follow_up_time = followUpTime || null;
      }

      await addDiscussion(lead.id, payload);

      // Reset form
      setNote("");
      setSetFollowUp(false);
      setFollowUpDate("");
      setFollowUpTime("");

      // Refresh timeline + parent list
      await fetchDiscussions();
      onUpdated();
    } catch (err) {
      setError(err.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  // ── Backdrop click ─────────────────────────────────────────────────────────

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function formatDateTime(dateStr) {
    if (!dateStr) return "";
    try {
      return format(parseISO(dateStr), "MMM d, yyyy · h:mm a");
    } catch {
      return dateStr;
    }
  }

  function formatFollowUp(date, time) {
    if (!date) return "";
    try {
      const d = format(parseISO(date), "MMM d, yyyy");
      if (time) {
        const [h, m] = time.split(":");
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${d}, ${display}:${m} ${ampm}`;
      }
      return d;
    } catch {
      return `${date} ${time || ""}`.trim();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="timeline-backdrop" onClick={handleBackdropClick}>
      <div className="timeline-dialog" role="dialog" aria-labelledby="timeline-title">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="timeline-dialog__header">
          <div className="timeline-dialog__lead-info">
            <h2 id="timeline-title" className="timeline-dialog__name">
              {lead.name}
            </h2>
            {lead.company && (
              <span className="timeline-dialog__company">{lead.company}</span>
            )}
            {lead.phone && (
              <span className="timeline-dialog__phone">📞 {lead.phone}</span>
            )}
          </div>
          <button
            className="timeline-dialog__close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* ── Status selector ─────────────────────────────────────────────── */}
        <div className="timeline-dialog__status-bar">
          <label className="timeline-dialog__status-label" htmlFor="status-select">
            Status
          </label>
          <select
            id="status-select"
            className="timeline-dialog__status-select"
            value={status}
            onChange={handleStatusChange}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* ── Timeline ────────────────────────────────────────────────────── */}
        <div className="timeline-dialog__timeline">
          {loading ? (
            <div className="timeline-dialog__loading">Loading discussions…</div>
          ) : discussions.length === 0 ? (
            <div className="timeline-dialog__empty">
              <span>💬</span>
              <p>No discussions yet. Log your first note below.</p>
            </div>
          ) : (
            <ul className="timeline-list">
              {discussions.map((d) => (
                <li key={d.id} className="timeline-list__item">
                  <div className="timeline-list__dot" />
                  <div className="timeline-list__content">
                    <span className="timeline-list__date">
                      {formatDateTime(d.created_at)}
                    </span>
                    <p className="timeline-list__note">{d.note}</p>
                    {d.follow_up_date && (
                      <div className="timeline-list__followup">
                        📅 Follow-up set for: {formatFollowUp(d.follow_up_date, d.follow_up_time)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Add note form ───────────────────────────────────────────────── */}
        <form className="timeline-dialog__form" onSubmit={handleSaveNote}>
          <textarea
            className="timeline-dialog__textarea"
            placeholder="Log a new discussion…"
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError("");
            }}
          />

          {/* Follow-up toggle */}
          <label className="timeline-dialog__checkbox-row">
            <input
              type="checkbox"
              checked={setFollowUp}
              onChange={(e) => setSetFollowUp(e.target.checked)}
            />
            <span>Set Follow-up</span>
          </label>

          {/* Follow-up date/time (conditional) */}
          {setFollowUp && (
            <div className="timeline-dialog__followup-fields">
              <input
                type="date"
                className="timeline-dialog__date-input"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required
              />
              <input
                type="time"
                className="timeline-dialog__time-input"
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
              />
            </div>
          )}

          {error && <span className="timeline-dialog__error">{error}</span>}

          <button
            className="timeline-dialog__save-btn"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Note"}
          </button>
        </form>
      </div>
    </div>
  );
}
