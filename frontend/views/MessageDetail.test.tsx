import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MessageDetail from "./MessageDetail";

describe("<MessageDetail />", () => {
  it("renders empty state when no message is selected", () => {
    render(<MessageDetail message={null} />);
    expect(
      screen.getByText("Select a message to inspect it"),
    ).toBeInTheDocument();
  });

  it("renders JSONTree with message body when a message is selected", () => {
    const message = {
      messageBody: '{"orderId": 42}',
      messageId: "msg-abc-123",
      messageAttributes: {
        SentTimestamp: "1700000000000",
      },
    };
    render(<MessageDetail message={message} />);
    // JSONTree renders keys as text nodes -- check that the parsed key appears
    expect(screen.getByText(/orderId/)).toBeInTheDocument();
  });

  it("renders messageId and sent timestamp in the header", () => {
    const message = {
      messageBody: "hello",
      messageId: "msg-xyz-789",
      messageAttributes: {
        SentTimestamp: "1700000000000",
      },
    };
    render(<MessageDetail message={message} />);
    expect(screen.getByText("msg-xyz-789")).toBeInTheDocument();
    expect(screen.getByText(/Sent:/)).toBeInTheDocument();
  });

  it("renders attributes accordion when customAttributes exist", () => {
    const message = {
      messageBody: "test body",
      messageId: "msg-attr-001",
      customAttributes: { env: "production", version: "2.0" },
    };
    render(<MessageDetail message={message} />);
    expect(screen.getByText("Message Attributes")).toBeInTheDocument();
  });
});
