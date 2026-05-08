import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LeadList from "../components/LeadList";

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const mockLeads = [
  {
    id: "1",
    name: "Sarah Connor",
    company: "Acme Corp",
    phone: "+1-555-0101",
    status: "New",
    follow_up_date: today,
    follow_up_time: "14:00",
    last_note: "Initial contact",
    last_note_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Tony Stark",
    company: "Stark Ind",
    phone: null,
    status: "Qualified",
    follow_up_date: null,
    follow_up_time: null,
    last_note: "Discussed pricing",
    last_note_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Bruce Wayne",
    company: "Wayne Ent",
    phone: null,
    status: "Won",
    follow_up_date: yesterday,
    follow_up_time: "10:00",
    last_note: "Contract signed",
    last_note_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

describe("LeadList", () => {
  it("renders lead names and status badges", () => {
    render(<LeadList leads={mockLeads} onSelectLead={() => {}} />);

    expect(screen.getByText("Sarah Connor")).toBeInTheDocument();
    expect(screen.getByText("Tony Stark")).toBeInTheDocument();
    expect(screen.getByText("Bruce Wayne")).toBeInTheDocument();

    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Qualified")).toBeInTheDocument();
    expect(screen.getByText("Won")).toBeInTheDocument();
  });

  it("shows Today's Follow-ups section when a lead has today's follow-up date", () => {
    render(<LeadList leads={mockLeads} onSelectLead={() => {}} />);

    expect(screen.getByText(/Today's Follow-ups/)).toBeInTheDocument();
  });

  it("applies overdue red-border class to overdue follow-up leads", () => {
    render(<LeadList leads={mockLeads} onSelectLead={() => {}} />);

    // Bruce Wayne has yesterday's follow-up → overdue
    const bruceRow = screen.getByText("Bruce Wayne").closest("li");
    expect(bruceRow).toHaveClass("lead-list__row--overdue");
  });

  it("shows empty state when leads array is empty", () => {
    render(<LeadList leads={[]} onSelectLead={() => {}} />);

    expect(screen.getByText("No leads found")).toBeInTheDocument();
  });

  it("shows search-aware empty state", () => {
    render(
      <LeadList leads={[]} onSelectLead={() => {}} searchQuery="xyz" />
    );

    expect(screen.getByText(/No leads found for/)).toBeInTheDocument();
    expect(screen.getByText("xyz")).toBeInTheDocument();
  });
});
