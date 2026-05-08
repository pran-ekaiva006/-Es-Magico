import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AddLeadModal from "../components/AddLeadModal";

describe("AddLeadModal", () => {
  it("shows validation error when name is empty and Save is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();

    render(<AddLeadModal onSave={onSave} onClose={onClose} />);

    // Click Save without entering a name
    await user.click(screen.getByText("Save Lead"));

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with correct data when form is valid", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<AddLeadModal onSave={onSave} onClose={onClose} />);

    await user.type(screen.getByLabelText(/Full Name/), "John Doe");
    await user.type(screen.getByLabelText(/Company/), "ACME");
    await user.type(screen.getByLabelText(/Phone/), "+1-555-1234");

    await user.click(screen.getByText("Save Lead"));

    expect(onSave).toHaveBeenCalledWith({
      name: "John Doe",
      company: "ACME",
      phone: "+1-555-1234",
      status: "New",
    });
  });

  it("closes modal on Cancel click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<AddLeadModal onSave={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clears validation error when user starts typing", async () => {
    const user = userEvent.setup();

    render(<AddLeadModal onSave={vi.fn()} onClose={vi.fn()} />);

    // Trigger error
    await user.click(screen.getByText("Save Lead"));
    expect(screen.getByText("Name is required")).toBeInTheDocument();

    // Start typing → error should disappear
    await user.type(screen.getByLabelText(/Full Name/), "A");
    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
  });
});
