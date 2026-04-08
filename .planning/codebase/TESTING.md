# Testing Patterns

**Analysis Date:** 2026-04-08

## Test Framework

**Runner:**
- Jest 30.3.0
- Config: `jest.config.js`
- Custom test environment: `frontend/setupTests.ts` (FixJSDOMEnvironment extending jest-environment-jsdom)
- ESM module support via ts-jest with useESM option

**Assertion Library:**
- Jest built-in assertions (`expect`)
- Testing Library matchers via `@testing-library/jest-dom` (^6.9.1)

**Run Commands:**
```bash
yarn test              # Run all tests (jest)
yarn test --watch     # Watch mode (derived from jest capability)
# Coverage collected automatically per jest.config.js: collectCoverage: true
```

## Test File Organization

**Location:**
- Co-located with source files in same directory
- Tests next to components/hooks/utils they test

**Naming:**
- `.test.tsx` suffix for React component tests
- Pattern: `ComponentName.test.tsx` paired with `ComponentName.tsx`
- Examples: `Alert.test.tsx`, `MessageItem.test.tsx`, `Overview.test.tsx`, `CreateQueueDialog.test.tsx`

**Structure:**
```
frontend/
├── components/
│   ├── Alert.tsx
│   ├── Alert.test.tsx
│   ├── MessageItem.tsx
│   ├── MessageItem.test.tsx
│   ├── CreateQueueDialog.tsx
│   ├── CreateQueueDialog.test.tsx
│   └── ...
├── views/
│   ├── Overview.tsx
│   └── Overview.test.tsx
└── ...
```

## Test Structure

**Suite Organization:**
```typescript
describe("<ComponentName /> spec", () => {
  beforeEach(() => {
    // Setup before each test
    jest.useFakeTimers();
    global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
      // Mock responses
    }) as typeof fetch;
  });

  afterEach(() => {
    // Cleanup after each test
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("describes behavior being tested", () => {
    render(<Component />);
    expect(screen.getByText("expected")).toBeInTheDocument();
  });
});
```

**Patterns:**
- Setup/teardown: `beforeEach` and `afterEach` blocks used for mock setup and cleanup
- Assertion pattern: Arrange → Act → Assert (implicit in render-then-assert style)
- Mock timers: `jest.useFakeTimers()` and `jest.useRealTimers()` for controlling time
- Component rendering: `render()` from Testing Library
- DOM queries: `screen.getByText()`, `screen.getByRole()`, `screen.getByLabelText()`, `screen.queryByText()`, `screen.getByDisplayValue()`
- Async handling: `waitFor()` and `act()` for async operations

## Mocking

**Framework:** Jest built-in mocking via `jest.fn()`

**Patterns:**
```typescript
// Mock function creation
const mockOnClose = jest.fn();
const mockSubmit = jest.fn();

// Mock global fetch
global.fetch = jest.fn(async (_url: string, options?: RequestInit) => {
  if (!options || options.method === "GET") {
    return Response.json(mockQueues);
  }
  const body = JSON.parse(options.body as string);
  switch (body.action) {
    case "GetRegion":
      return Response.json({ region: "us-east-1" });
    case "GetMessages":
      return Response.json(mockMessages);
    // ... more cases
  }
}) as typeof fetch;

// Verify mock was called
expect(mockOnClose).toHaveBeenCalledTimes(1);
expect(fetchHandler).toHaveBeenCalledWith(
  expect.any(String),
  expect.objectContaining({
    body: expect.stringContaining('"DeleteQueue"'),
  }),
);

// Access mock call arguments
const submitted = mockSubmit.mock.calls[0][0];
expect(submitted.messageBody).toBe('{"hello": "world"}');
```

**What to Mock:**
- Global `fetch` API for HTTP calls
- User interaction callbacks: `onSubmit`, `onClose`, `onError`
- External library methods when testing component isolation

**What NOT to Mock:**
- React components themselves (render actual components)
- Testing Library utilities
- User interactions (use `fireEvent` or `userEvent` instead)
- Internal component state management

## Fixtures and Factories

**Test Data:**
```typescript
// Reusable test data fixtures
const baseMessage = {
  messageBody: '{"orderId": 123, "status": "shipped"}',
  messageId: "msg-abc-123",
  messageAttributes: {
    SentTimestamp: "1700000000000",
    ApproximateFirstReceiveTimestamp: "1700000001000",
  },
};

// Variations built from base
const plainMessage = {
  ...baseMessage,
  messageBody: "Hello, world!",
};

const fifoMessage = {
  ...baseMessage,
  messageAttributes: {
    ...baseMessage.messageAttributes,
    MessageGroupId: "group-1",
    MessageDeduplicationId: "dedup-42",
  },
};

// Constants for queue types
const standardQueue: Queue = { QueueName: "test-queue" };
const fifoQueue: Queue = { QueueName: "test-queue.fifo" };
```

**Location:**
- Defined at top of test file, before describe block
- Module-level constants for reusable test fixtures
- Custom variations created inline when needed

## Coverage

**Requirements:** Automatically enabled via `collectCoverage: true` in jest.config.js

**View Coverage:**
```bash
# Coverage reports generated automatically
# Default output directory: coverage/
# Open coverage/lcov-report/index.html in browser
```

## Test Types

**Unit Tests:**
- Scope: Individual React components in isolation
- Approach: Render component with props, test user interactions and output
- Examples: Alert, TabPanel, CreateQueueDialog, SendMessageDialog
- Typical test: "renders button", "calls callback on click", "displays correct text"

**Integration Tests:**
- Scope: Component with mocked HTTP layer (fetch)
- Approach: Mock global fetch, test full component flow including async operations
- Examples: Overview component with multiple queue/message operations
- Typical test: "fetches queues on mount", "displays queue list", "deletes queue when button clicked"

**E2E Tests:**
- Framework: Not used
- Notes: No end-to-end test framework configured; integration tests with mocked fetch cover most scenarios

## Common Patterns

**Async Testing:**
```typescript
// Using act() for state updates
await act(async () => {
  render(<Overview />);
});

// Using waitFor() for eventual DOM updates
await waitFor(() => {
  expect(screen.getByText("us-east-1")).toBeInTheDocument();
});

// Combining both
it("renders queues after fetch", async () => {
  await act(async () => {
    render(<Overview />);
  });
  
  await waitFor(() => {
    expect(screen.getByText("test-queue")).toBeInTheDocument();
  });
});
```

**Error Testing:**
```typescript
// Test error handling
it("shows error alert when API call fails", async () => {
  global.fetch = jest.fn(async () => {
    throw new Error("Network failure");
  }) as typeof fetch;

  await act(async () => {
    render(<Overview />);
  });

  await waitFor(() => {
    expect(screen.getByText("Network failure")).toBeInTheDocument();
  });
});

// Test error dismissal
it("dismisses error alert when close is clicked", async () => {
  // ... setup error state ...
  
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
  });

  await waitFor(() => {
    expect(screen.queryByText("Something broke")).not.toBeInTheDocument();
  });
});
```

**Snapshot Testing:**
```typescript
// Used sparingly, only for static component rendering
it("renders the Alert with info severity", () => {
  const view = render(
    <Alert message={"Hello"} severity={"info"} onClose={() => {}} />,
  );
  expect(view).toMatchSnapshot();
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
```

**Dialog/Modal Testing:**
```typescript
// Testing dialog interactions
it("opens dialog when button is clicked", () => {
  render(<CreateQueueDialog onSubmit={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Create Queue" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

// Testing form submission within dialog
it("submits form data on submit button click", () => {
  const mockSubmit = jest.fn();
  render(<CreateQueueDialog onSubmit={mockSubmit} />);
  
  fireEvent.click(screen.getByRole("button", { name: "Create Queue" }));
  fireEvent.change(screen.getByLabelText("Queue-Name"), {
    target: { value: "my-queue" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  
  expect(mockSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ QueueName: "my-queue" }),
  );
});
```

**Accessibility Attribute Testing:**
```typescript
// Verify accessible names and roles
it("sets correct accessibility attributes", () => {
  render(
    <TabPanel index={2} value={2}>
      <div>Tab content</div>
    </TabPanel>,
  );
  const panel = screen.getByRole("tabpanel");
  expect(panel).toHaveAttribute("id", "simple-tabpanel-2");
  expect(panel).toHaveAttribute("aria-labelledby", "simple-tab-2");
});
```

## Test Environment Setup

**Custom Environment:**
- File: `frontend/setupTests.ts`
- Extends: `jest-environment-jsdom`
- Polyfills added: `fetch`, `Headers`, `Request`, `Response` (JSDOM compatibility)
- Environment variables set:
  - `process.env.DEV = 'true'`
  - `process.env.REACT_APP_VERSION = '1.0.0-test'`

**Custom Transformer:**
- File: `frontend/jestTransformer.cjs`
- Purpose: Convert `import.meta.env.VARIABLE` to `process.env["VARIABLE"]` for Jest compatibility
- Extends ts-jest transformer with ESM support

---

*Testing analysis: 2026-04-08*
