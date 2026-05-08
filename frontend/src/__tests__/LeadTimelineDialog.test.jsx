import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LeadTimelineDialog from "../components/LeadTimelineDialog";

// ── Mock the API module ──────────────────────────────────────────────────────
vi.mock("../api", () => ({
  getDiscussions: vi.fn(),
  addDiscussion: vi.fn(),
  updateStatus: vi.fn(),
}));

import { getDiscussions, addDiscussion, updateStatus } from "../api";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockLead = {
  id: "lead-1",
  name: "Sarah Connor",
  company: "Cyberdyne",
  phone: "+1-555-0101",
  status: "New",
};

const mockDiscussions = [
  {
    id: "d2",
    lead_id: "lead-1",
    note: "Follow-up call scheduled",
    follow_up_date: "2026-05-10",
    follow_up_time: "14:00",
    created_at: "2026-05-05T15:30:00",
  },
  {
    id: "d1",
    lead_id: "lead-1",
    note: "Initial outreach email sent",
    follow_up_date: null,
    follow_up_time: null,
    created_at: "2026-05-01T10:00:00",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
  lead: mockLead,
  onClose: vi.fn(),
  onUpdated: vi.fn(),
  onOptimisticStatus: vi.fn(),
  onError: vi.fn(),
};

function renderDialog(overrides = {}) {
  return render(<LeadTimelineDialog {...defaultProps} {...overrides} />);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("LeadTimelineDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: resolve with discussions in reverse chronological order
    getDiscussions.mockResolvedValue(mockDiscussions);
    addDiscussion.mockResolvedValue({ id: "d3", note: "new" });
    updateStatus.mockResolvedValue({ ...mockLead, status: "Contacted" });
  });

  it("renders lead name and discussions in reverse order", async () => {
    renderDialog();

    // Lead name in header
    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByText("Cyberdyne")).toBeInTheDocument();

    // Wait for discussions to load
    await waitFor(() => {
      expect(screen.getByText("Initial outreach email sent")).toBeInTheDocument();
    });

    expect(screen.getByText("Follow-up call scheduled")).toBeInTheDocument();

    // Verify order: d2 (May 5) should appear before d1 (May 1) in the DOM
    // since the API returns them sorted DESC
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Follow-up call scheduled");
    expect(items[1]).toHaveTextContent("Initial outreach email sent");
  });

  it("status dropdown change calls updateStatus with correct args", async () => {
    const user = userEvent.setup();
    renderDialog();

    // Wait for discussions to load (component is ready)
    await waitFor(() => {
      expect(getDiscussions).toHaveBeenCalled();
    });

    const select = screen.getByLabelText("Status");
    await user.selectOptions(select, "Contacted");

    expect(updateStatus).toHaveBeenCalledWith("lead-1", "Contacted");
    expect(defaultProps.onOptimisticStatus).toHaveBeenCalledWith("lead-1", "Contacted");
  });

  it("shows error when Save Note is clicked with empty textarea", async () => {
    const user = userEvent.setup();
    renderDialog();

    await waitFor(() => {
      expect(getDiscussions).toHaveBeenCalled();
    });

    // Click Save Note without entering text
    await user.click(screen.getByText("Save Note"));

    expect(screen.getByText("Note cannot be empty")).toBeInTheDocument();
    expect(addDiscussion).not.toHaveBeenCalled();
  });

  it("checking Set Follow-up checkbox reveals date and time inputs", async () => {
    const user = userEvent.setup();
    renderDialog();

    await waitFor(() => {
      expect(getDiscussions).toHaveBeenCalled();
    });

    // Date/time inputs should not be visible initially
    expect(screen.queryByDisplayValue("")).not.toBeNull(); // textarea exists
    const dateInputsBefore = document.querySelectorAll('input[type="date"]');
    expect(dateInputsBefore).toHaveLength(0);

    // Check the follow-up checkbox
    await user.click(screen.getByText("Set Follow-up"));

    // Now date and time inputs should appear
    const dateInput = document.querySelector('input[type="date"]');
    const timeInput = document.querySelector('input[type="time"]');
    expect(dateInput).toBeInTheDocument();
    expect(timeInput).toBeInTheDocument();
  });

  it("form submits correctly and calls onUpdated after success", async () => {
    const user = userEvent.setup();
    renderDialog();

    await waitFor(() => {
      expect(getDiscussions).toHaveBeenCalled();
    });

    // Type a note
    const textarea = screen.getByPlaceholderText("Log a new discussion…");
    await user.type(textarea, "Had a productive demo call");

    // Submit the form
    await user.click(screen.getByText("Save Note"));

    await waitFor(() => {
      expect(addDiscussion).toHaveBeenCalledWith("lead-1", {
        note: "Had a productive demo call",
      });
    });

    // Should refresh and notify parent
    await waitFor(() => {
      expect(defaultProps.onUpdated).toHaveBeenCalled();
    });
  });
});
