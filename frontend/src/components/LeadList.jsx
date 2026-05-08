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

export default function LeadList({ leads, onSelectLead }) {
  if (!leads || leads.length === 0) {
    return (
      <div className="lead-list-empty">
        <span className="lead-list-empty__icon">📋</span>
        <p>No leads found</p>
      </div>
    );
  }

  return (
    <ul className="lead-list" role="list">
      {leads.map((lead) => {
        const followUpState = getFollowUpState(lead.follow_up_date);
        const rowClass = [
          "lead-list__row",
          followUpState === "overdue" ? "lead-list__row--overdue" : "",
        ]
          .join(" ")
          .trim();

        return (
          <li
            key={lead.id}
            className={rowClass}
            onClick={() => onSelectLead(lead)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectLead(lead);
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
      })}
    </ul>
  );
}
