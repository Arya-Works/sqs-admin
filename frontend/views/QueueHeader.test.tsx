import { render, screen } from "@testing-library/react";
import QueueHeader from "./QueueHeader";
import "@testing-library/jest-dom";

const baseProps = {
  lastUpdatedAt: null,
  consecutiveEmptyCount: { current: 0 } as React.MutableRefObject<number>,
};

describe("<QueueHeader /> count chip", () => {
  it("renders count chip when approximateMessageCount > 0", () => {
    render(
      <QueueHeader
        {...baseProps}
        approximateMessageCount="12"
      />,
    );
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("does not render count when approximateMessageCount is 0", () => {
    render(
      <QueueHeader
        {...baseProps}
        approximateMessageCount="0"
      />,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("does not render count when approximateMessageCount is undefined", () => {
    render(<QueueHeader {...baseProps} />);
    const allChipLabels = document.querySelectorAll(".MuiChip-label");
    expect(allChipLabels).toHaveLength(0);
  });
});
