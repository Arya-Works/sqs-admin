import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import MessageInbox from "./MessageInbox";

describe("<MessageInbox />", () => {
  it("renders a message row with timestamp, MessageId, and body preview", () => {
    const messages = [
      {
        messageBody:
          "This is a test message body that is long enough to be truncated at sixty chars",
        messageId: "msg-row-001",
        messageAttributes: {
          SentTimestamp: String(Date.now() - 30000), // 30s ago
        },
      },
    ];
    render(
      <MessageInbox
        messages={messages}
        selectedMessageId={null}
        consecutiveEmptyCount={{ current: 0 }}
        selectedQueue={{ QueueName: "test-queue" }}
        onSelectMessage={jest.fn()}
      />,
    );
    expect(screen.getByText("msg-row-001")).toBeInTheDocument();
    // Body is truncated to 60 chars + ellipsis
    expect(
      screen.getByText(/This is a test message body that is long enough to be tr/),
    ).toBeInTheDocument();
  });

  it("renders 'Select a queue to view messages' when no queue selected", () => {
    render(
      <MessageInbox
        messages={[]}
        selectedMessageId={null}
        consecutiveEmptyCount={{ current: 0 }}
        selectedQueue={null}
        onSelectMessage={jest.fn()}
      />,
    );
    expect(
      screen.getByText("Select a queue to view messages"),
    ).toBeInTheDocument();
  });

  it("renders 'No messages in this queue' after 3 consecutive empty polls", () => {
    render(
      <MessageInbox
        messages={[]}
        selectedMessageId={null}
        consecutiveEmptyCount={{ current: 3 }}
        selectedQueue={{ QueueName: "empty-queue" }}
        onSelectMessage={jest.fn()}
      />,
    );
    expect(
      screen.getByText("No messages in this queue"),
    ).toBeInTheDocument();
  });
});
