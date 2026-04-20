import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import MessageDetail from "./MessageDetail";

const baseMessage = {
  messageBody: '{"orderId": 42}',
  messageId: "msg-abc-123",
  messageAttributes: {
    SentTimestamp: "1700000000000",
  },
};

describe("<MessageDetail />", () => {
  it("renders empty state when no message is selected", () => {
    render(<MessageDetail message={null} />);
    expect(
      screen.getByText("Select a message to inspect it"),
    ).toBeInTheDocument();
  });

  it("renders JSONTree with message body when a message is selected (tree view default)", () => {
    render(<MessageDetail message={baseMessage} />);
    // JSONTree renders keys as text nodes
    expect(screen.getByText(/orderId/)).toBeInTheDocument();
  });

  it("renders messageId and sent timestamp in the header", () => {
    render(<MessageDetail message={baseMessage} />);
    expect(screen.getByText("msg-abc-123")).toBeInTheDocument();
    expect(screen.getByText(/Sent:/)).toBeInTheDocument();
  });

  it("renders attributes accordion when customAttributes exist", () => {
    const msg = {
      messageBody: "test body",
      messageId: "msg-attr-001",
      customAttributes: { env: "production", version: "2.0" },
    };
    render(<MessageDetail message={msg} />);
    expect(screen.getByText("Message Attributes")).toBeInTheDocument();
  });

  it("renders a delete button in the sticky header when a message is selected", () => {
    render(<MessageDetail message={baseMessage} />);
    expect(screen.getByRole("button", { name: "Delete message" })).toBeInTheDocument();
  });

  it("opens the confirmation dialog when the delete button is clicked", () => {
    render(<MessageDetail message={baseMessage} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete message" }));
    expect(screen.getByText("Delete message?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onDelete with the current message when Delete is clicked in the dialog", () => {
    const onDelete = jest.fn();
    render(<MessageDetail message={baseMessage} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete message" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(baseMessage);
  });

  it("does not call onDelete when Cancel is clicked in the dialog", () => {
    const onDelete = jest.fn();
    render(<MessageDetail message={baseMessage} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete message" }));
    // Dialog is open
    expect(screen.getByText("Delete message?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    // onDelete must not have been called
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("switches to raw view and renders pre element when Raw button is clicked", () => {
    const msg = { messageBody: "plain raw text", messageId: "msg-raw-001" };
    render(<MessageDetail message={msg} />);
    fireEvent.click(screen.getByRole("button", { name: "Raw" }));
    const preEl = document.querySelector("pre");
    expect(preEl).toBeInTheDocument();
    expect(preEl?.textContent).toBe("plain raw text");
  });

  it("switches back to tree view from raw view when Tree button is clicked", () => {
    render(<MessageDetail message={baseMessage} />);
    // Switch to raw
    fireEvent.click(screen.getByRole("button", { name: "Raw" }));
    expect(document.querySelector("pre")).toBeInTheDocument();

    // Switch back to tree — JSONTree renders keys again
    fireEvent.click(screen.getByRole("button", { name: "Tree" }));
    expect(document.querySelector("pre")).not.toBeInTheDocument();
    expect(screen.getByText(/orderId/)).toBeInTheDocument();
  });

  it("copy button calls navigator.clipboard.writeText with the message body", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<MessageDetail message={baseMessage} />);
    // MUI Tooltip passes its title as aria-label to the cloned IconButton child
    fireEvent.click(screen.getByLabelText("Copy raw body"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(baseMessage.messageBody);
    });
  });

  it("copy button changes to 'Copied!' aria-label after clicking", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<MessageDetail message={baseMessage} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Copy raw body"));
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Copied!")).toBeInTheDocument();
    });
  });

  it("renders message attributes accordion with JSONTree when customAttributes are present", async () => {
    const msg = {
      messageBody: "body",
      messageId: "msg-cust-001",
      customAttributes: { traceId: "abc123", source: "order-service" },
    };
    render(<MessageDetail message={msg} />);

    // Accordion closed by default — click to expand
    await act(async () => {
      fireEvent.click(screen.getByText("Message Attributes"));
    });

    await waitFor(() => {
      // JSONTree renders the keys of customAttributes
      expect(screen.getByText(/traceId/)).toBeInTheDocument();
    });
  });

  it("renders metadata fields when messageAttributes are present", () => {
    const msg = {
      messageBody: "body",
      messageId: "msg-meta-001",
      messageAttributes: {
        SentTimestamp: "1700000000000",
        ApproximateReceiveCount: "3",
        SenderId: "AIDAI123ABC",
        ApproximateFirstReceiveTimestamp: "1700000001000",
      },
    };
    render(<MessageDetail message={msg} />);
    expect(screen.getByText("Receive Count")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Sender ID")).toBeInTheDocument();
    expect(screen.getByText("AIDAI123ABC")).toBeInTheDocument();
    expect(screen.getByText("First Received")).toBeInTheDocument();
  });

  it("does not render metadata labels for undefined attributes", () => {
    const msg = { messageBody: "body", messageId: "msg-meta-002" };
    render(<MessageDetail message={msg} />);
    expect(screen.queryByText("Receive Count")).not.toBeInTheDocument();
    expect(screen.queryByText("Sender ID")).not.toBeInTheDocument();
  });

  it("renders Metadata section header", () => {
    render(<MessageDetail message={baseMessage} />);
    expect(screen.getByText("Metadata")).toBeInTheDocument();
  });

  it("renders Body section header", () => {
    render(<MessageDetail message={baseMessage} />);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
