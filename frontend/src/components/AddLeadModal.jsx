import { useState } from "react";
import "./AddLeadModal.css";

export default function AddLeadModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await onSave({
        name: name.trim(),
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        status: "New",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save lead");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-labelledby="modal-title">
        {/* Header */}
        <div className="modal__header">
          <h2 id="modal-title" className="modal__title">Add New Lead</h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          {/* Name (required) */}
          <div className="modal__field">
            <label className="modal__label" htmlFor="lead-name">
              Full Name <span className="modal__required">*</span>
            </label>
            <input
              id="lead-name"
              className={`modal__input ${error ? "modal__input--error" : ""}`}
              type="text"
              placeholder="e.g. Sarah Connor"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              autoFocus
            />
            {error && <span className="modal__error">{error}</span>}
          </div>

          {/* Company */}
          <div className="modal__field">
            <label className="modal__label" htmlFor="lead-company">
              Company
            </label>
            <input
              id="lead-company"
              className="modal__input"
              type="text"
              placeholder="e.g. Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="modal__field">
            <label className="modal__label" htmlFor="lead-phone">
              Phone
            </label>
            <input
              id="lead-phone"
              className="modal__input"
              type="tel"
              placeholder="e.g. +1-555-0101"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Status (read-only) */}
          <div className="modal__field">
            <label className="modal__label">Status</label>
            <div className="modal__status-pill">New</div>
          </div>

          {/* Actions */}
          <div className="modal__actions">
            <button
              className="modal__btn modal__btn--cancel"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="modal__btn modal__btn--save"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
