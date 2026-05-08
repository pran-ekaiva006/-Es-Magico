import { formatDistanceToNow, isToday, isPast, parseISO, startOfDay } from "date-fns";
import "./LeadList.css";

const STATUS_COLORS = {
  New: "green",
  Contacted: "blue",
  Qualified: "purple",
  "Proposal Sent": "orange",
  Won: "teal",
  Lost: "gray",
};

function truncate(str, len = 60) {
  if (!str) return "No notes yet";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

function getFollowUpState(followUpDate) {
  if (!followUpDate) return null;
  const date = parseISO(followUpDate);
  if (isToday(date)) return "today";
  if (isPast(startOfDay(date))) return "overdue";
  return "future";
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default function LeadList({ leads, onSelectLead, searchQuery }) {
  if (!leads || leads.length === 0) {
    return (
      <div className="lead-list-empty">
        <span className="lead-list-empty__icon">📋</span>
        {searchQuery ? (
          <p>No leads found for "<strong>{searchQuery}</strong>"</p>
        ) : (
          <p>No leads found</p>
        )}
      </div>
    );
  }

  // Split into today's follow-ups vs. everything else
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const todayLeads = leads.filter((l) => l.follow_up_date === today);
  const otherLeads = leads.filter((l) => l.follow_up_date !== today);

  return (
    <div className="lead-list-sections">
      {/* ── Pinned: Today's Follow-ups ──────────────────────────────────── */}
      {todayLeads.length > 0 && (
        <section className="lead-list-section lead-list-section--pinned">
          <h3 className="lead-list-section__title">
            📌 Today's Follow-ups
            <span className="lead-list-section__count">{todayLeads.length}</span>
          </h3>
          <ul className="lead-list lead-list--pinned" role="list">
            {todayLeads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onSelect={onSelectLead} pinned />
            ))}
          </ul>
        </section>
      )}

      {/* ── All Leads ───────────────────────────────────────────────────── */}
      <section className="lead-list-section">
        <h3 className="lead-list-section__title">
          All Leads
          <span className="lead-list-section__count">{otherLeads.length}</span>
        </h3>
        <ul className="lead-list" role="list">
          {otherLeads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} onSelect={onSelectLead} />
          ))}
        </ul>
      </section>
    </div>
  );
}

// ─── Row sub-component ────────────────────────────────────────────────────────

function LeadRow({ lead, onSelect, pinned = false }) {
  const followUpState = getFollowUpState(lead.follow_up_date);
  const rowClass = [
    "lead-list__row",
    followUpState === "overdue" ? "lead-list__row--overdue" : "",
    pinned ? "lead-list__row--pinned" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      className={rowClass}
      onClick={() => onSelect(lead)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(lead);
      }}
    >
      {/* Top row: name + status badge */}
      <div className="lead-list__header">
        <span className="lead-list__name">
          {lead.name}
          {lead.company && (
            <span className="lead-list__company"> ({lead.company})</span>
          )}
        </span>
        <span
          className={`lead-list__badge lead-list__badge--${STATUS_COLORS[lead.status] || "gray"}`}
        >
          {lead.status}
        </span>
      </div>

      {/* Last note + time-ago */}
      <div className="lead-list__note-row">
        <span className="lead-list__note">
          {truncate(lead.last_note)}
        </span>
        {lead.last_note_at && (
          <span className="lead-list__time">{timeAgo(lead.last_note_at)}</span>
        )}
      </div>

      {/* Follow-up indicator */}
      {followUpState === "today" && (
        <div className="lead-list__followup lead-list__followup--today">
          <span className="lead-list__bell">🔔</span>
          Follow-up at {formatTime(lead.follow_up_time)}
        </div>
      )}
      {followUpState === "overdue" && (
        <div className="lead-list__followup lead-list__followup--overdue">
          <span className="lead-list__bell">🔔</span>
          Follow-up overdue ({lead.follow_up_date})
        </div>
      )}
    </li>
  );
}
