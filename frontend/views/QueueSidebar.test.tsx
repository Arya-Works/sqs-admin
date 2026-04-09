import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QueueSidebar from "./QueueSidebar";
import "@testing-library/jest-dom";

const baseProps = {
  queues: [
    {
      QueueName: "active-queue",
      QueueUrl: "http://localhost/active-queue",
      QueueAttributes: { ApproximateNumberOfMessages: "5" },
    },
    {
      QueueName: "empty-queue",
      QueueUrl: "http://localhost/empty-queue",
      QueueAttributes: { ApproximateNumberOfMessages: "0" },
    },
  ],
  region: { region: "us-east-1" },
  selectedQueue: null,
  pollingPaused: false,
  perQueuePaused: {},
  disabledStatus: true,
  onSelectQueue: jest.fn(),
  onToggleGlobalPause: jest.fn(),
  onToggleQueuePause: jest.fn(),
  onCreateQueue: jest.fn(),
  onDeleteQueue: jest.fn(),
  onSendMessage: jest.fn(),
  onPurgeQueue: jest.fn(),
};

describe("<QueueSidebar /> count chip", () => {
  it("renders count chip when ApproximateNumberOfMessages > 0", () => {
    render(
      <MemoryRouter>
        <QueueSidebar {...baseProps} />
      </MemoryRouter>,
    );
    const chip = screen.getByText("5");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass("MuiChip-label");
  });

  it("does not render chip when count is 0", () => {
    render(
      <MemoryRouter>
        <QueueSidebar {...baseProps} />
      </MemoryRouter>,
    );
    // "0" should not appear as a chip label in the document
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("does not render chip when QueueAttributes is absent", () => {
    const propsWithNoAttrs = {
      ...baseProps,
      queues: [
        ...baseProps.queues,
        {
          QueueName: "no-attrs-queue",
          QueueUrl: "http://localhost/no-attrs-queue",
        },
      ],
    };
    render(
      <MemoryRouter>
        <QueueSidebar {...propsWithNoAttrs} />
      </MemoryRouter>,
    );
    // The "5" chip should still be present, but no extra chip for no-attrs-queue
    expect(screen.getByText("5")).toBeInTheDocument();
    // no-attrs-queue row should not contain a chip; verify by checking no "0" or extra chip appears
    const allChipLabels = document.querySelectorAll(".MuiChip-label");
    expect(allChipLabels).toHaveLength(1);
  });
});
