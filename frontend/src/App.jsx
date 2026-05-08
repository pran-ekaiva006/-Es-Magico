import { useState, useEffect, useCallback, useRef } from "react";
import { getLeads, createLead } from "./api";
import LeadList from "./components/LeadList";
import AddLeadModal from "./components/AddLeadModal";
import LeadTimelineDialog from "./components/LeadTimelineDialog";
import "./App.css";

const FILTER_OPTIONS = ["All", "New", "Contacted", "Qualified", "Proposal Sent"];

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // ── Debounce search (300ms) ────────────────────────────────────────────────
  const debounceRef = useRef(null);

  function handleSearchChange(e) {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Fetch leads ────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const status = statusFilter === "All" ? undefined : statusFilter;
      const search = debouncedSearch.trim() || undefined;
      const data = await getLeads(status, search);
      setLeads(data);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleCreateLead(formData) {
    await createLead(formData);
    await fetchLeads();
  }

  function handleSelectLead(lead) {
    setSelectedLead(lead);
  }

  function handleDialogUpdated() {
    fetchLeads(); // refresh the list when status/notes change
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__header-left">
            <h1 className="app__logo">
              <span className="app__logo-icon">⚡</span> LeadFlow
            </h1>
            <span className="app__subtitle">CRM Dashboard</span>
          </div>
          <button
            className="app__add-btn"
            onClick={() => setShowAddModal(true)}
          >
            + Add New Lead
          </button>
        </div>
      </header>

      {/* ── Toolbar: filters + search ───────────────────────────────────── */}
      <div className="app__toolbar">
        <div className="app__filters">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`app__filter-pill ${statusFilter === opt ? "app__filter-pill--active" : ""}`}
              onClick={() => setStatusFilter(opt)}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="app__search-wrapper">
          <span className="app__search-icon">🔍</span>
          <input
            className="app__search"
            type="text"
            placeholder="Search leads…"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button
              className="app__search-clear"
              onClick={() => {
                setSearchQuery("");
                setDebouncedSearch("");
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Lead list ───────────────────────────────────────────────────── */}
      <main className="app__content">
        {loading ? (
          <div className="app__loading">
            <div className="app__spinner" />
            <span>Loading leads…</span>
          </div>
        ) : (
          <LeadList leads={leads} onSelectLead={handleSelectLead} />
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSave={handleCreateLead}
        />
      )}

      {selectedLead && (
        <LeadTimelineDialog
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleDialogUpdated}
        />
      )}
    </div>
  );
}
