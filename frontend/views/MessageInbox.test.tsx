import { render, screen, fireEvent } from "@testing-library/react";
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

  it("does NOT show 'No messages' empty state when messages exist even if consecutiveEmptyCount >= 3", () => {
    // Branch: messages.length > 0 means the empty-state condition is false
    const messages = [
      {
        messageBody: "still here",
        messageId: "msg-still-001",
        messageAttributes: {},
      },
    ];
    render(
      <MessageInbox
        messages={messages}
        selectedMessageId={null}
        consecutiveEmptyCount={{ current: 5 }}
        selectedQueue={{ QueueName: "non-empty-queue" }}
        onSelectMessage={jest.fn()}
      />,
    );
    expect(screen.queryByText("No messages in this queue")).not.toBeInTheDocument();
    expect(screen.getByText("still here")).toBeInTheDocument();
  });

  it("calls onSelectMessage with the clicked message", () => {
    const onSelectMessage = jest.fn();
    const messages = [
      {
        messageBody: "click me",
        messageId: "msg-click-001",
        messageAttributes: {},
      },
    ];
    render(
      <MessageInbox
        messages={messages}
        selectedMessageId={null}
        consecutiveEmptyCount={{ current: 0 }}
        selectedQueue={{ QueueName: "test-queue" }}
        onSelectMessage={onSelectMessage}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Message msg-click-001/i }));
    expect(onSelectMessage).toHaveBeenCalledWith(messages[0]);
  });

  it("highlights the selected message row", () => {
    const messages = [
      { messageBody: "msg one", messageId: "sel-001", messageAttributes: {} },
      { messageBody: "msg two", messageId: "sel-002", messageAttributes: {} },
    ];
    render(
      <MessageInbox
        messages={messages}
        selectedMessageId="sel-001"
        consecutiveEmptyCount={{ current: 0 }}
        selectedQueue={{ QueueName: "test-queue" }}
        onSelectMessage={jest.fn()}
      />,
    );
    const selectedBtn = screen.getByRole("button", { name: /Message sel-001/i });
    expect(selectedBtn).toHaveClass("Mui-selected");
  });

  it("renders a divider between multiple message rows", () => {
    const messages = [
      { messageBody: "first", messageId: "div-001", messageAttributes: {} },
      { messageBody: "second", messageId: "div-002", messageAttributes: {} },
    ];
    const { container } = render(
      <MessageInbox
        messages={messages}
        selectedMessageId={null}
        consecutiveEmptyCount={{ current: 0 }}
        selectedQueue={{ QueueName: "test-queue" }}
        onSelectMessage={jest.fn()}
      />,
    );
    // MUI Divider renders an <hr> element
    expect(container.querySelectorAll("hr").length).toBeGreaterThan(0);
  });
});
