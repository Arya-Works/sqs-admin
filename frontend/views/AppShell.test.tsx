import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import AppShell from "./AppShell";

const baseProps = {
  region: { region: "us-east-1" },
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
