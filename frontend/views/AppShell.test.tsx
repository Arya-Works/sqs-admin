import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import AppShell from "./AppShell";

const baseProps = {
  region: { region: "us-east-1" },
  globalPaused: false,
  onToggleGlobalPause: jest.fn(),
  onCreateQueue: jest.fn(),
  onAddColumn: jest.fn(),
  canAddColumn: true,
};

describe("<AppShell />", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders AppBar with app title", () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("SQS Admin")).toBeInTheDocument();
  });

  it("displays the region chip", () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByText("us-east-1")).toBeInTheDocument();
  });

  it("shows Pause all polling button when not paused", () => {
    render(<AppShell {...baseProps} />);
    expect(screen.getByLabelText("Pause all polling")).toBeInTheDocument();
  });

  it("shows Resume all polling button when globalPaused is true", () => {
    render(<AppShell {...baseProps} globalPaused={true} />);
    expect(screen.getByLabelText("Resume all polling")).toBeInTheDocument();
  });

  it("calls onToggleGlobalPause when pause button is clicked", () => {
    const onToggle = jest.fn();
    render(<AppShell {...baseProps} onToggleGlobalPause={onToggle} />);
    fireEvent.click(screen.getByLabelText("Pause all polling"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("add column button is enabled when canAddColumn is true", () => {
    render(<AppShell {...baseProps} canAddColumn={true} />);
    const addBtn = screen.getByRole("button", { name: "Add column" });
    expect(addBtn).not.toBeDisabled();
  });

  it("add column button is disabled when canAddColumn is false", () => {
    render(<AppShell {...baseProps} canAddColumn={false} />);
    const addBtn = screen.getByRole("button", { name: "Add column" });
    expect(addBtn).toBeDisabled();
  });

  it("calls onAddColumn when add column button is clicked", () => {
    const onAdd = jest.fn();
    render(<AppShell {...baseProps} onAddColumn={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
