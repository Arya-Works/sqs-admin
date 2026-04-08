# Coding Conventions

**Analysis Date:** 2026-04-08

## Naming Patterns

**Files:**
- PascalCase for components: `Alert.tsx`, `MessageItem.tsx`, `CreateQueueDialog.tsx`
- camelCase for hooks: `useInterval.tsx`
- camelCase for utility/API files: `Http.tsx`
- lowercase with extensions for config: `setupTests.ts`, `jestTransformer.cjs`
- lowercase with `.test.tsx` suffix for test files: `Alert.test.tsx`, `Overview.test.tsx`

**Functions:**
- camelCase for component functions and regular functions
- PascalCase for React component exports (components are capitalized)
- Handler functions prefixed with `handle`: `handleClickOpen`, `handleClose`, `handleChange`
- Descriptive action names: `submitCreateQueue`, `receiveMessageFromCurrentQueue`, `deleteCurrentQueue`
- Utility functions use simple descriptive names: `callApi`, `toLocaleString`, `getJsonOrRawData`

**Variables:**
- camelCase for all variables and state
- Prefixed with `is` or `has` for boolean values: `isFifoQueue`, `disabledStatus` (exception: could be more consistently `isDisabled`)
- Specific names for state setters following React convention: `setListItemIndex`, `setQueues`, `setMessages`, `setError`
- Underscore prefixes avoided; no Hungarian notation

**Types:**
- PascalCase for interface names: `TabPanelProps`, `CreateQueueDialogProps`, `SendMessageDialogProps`, `AlertProps`, `Queue`, `AwsRegion`, `SqsMessage`, `ApiCall`
- Props interfaces always suffixed with `Props`: `MessageItemProps` (implied from usage pattern)

## Code Style

**Formatting:**
- Tool: Prettier
- Config: `.prettierrc.json` (empty default configuration, uses Prettier defaults)
- Line ending: LF (inferred from .prettierignore)
- Default: 80-character line width (Prettier default)
- Trailing commas in objects/arrays

**Linting:**
- No explicit ESLint config found; TypeScript strict mode enforced via `tsconfig.json`
- `strict: true` in TypeScript compiler options enforces strict null checks and type safety

**TypeScript Strictness:**
- `strict: true` - Full strict mode
- `noFallthroughCasesInSwitch: true` - Prevents accidental fall-throughs in switch statements
- `forceConsistentCasingInFileNames: true` - Enforces case-sensitivity in imports
- `isolatedModules: true` - Each file compiled independently

## Import Organization

**Order:**
1. React and third-party UI libraries: `import React from "react"`; `import { Component } from "@mui/material"`
2. Material-UI components and icons: `import { AlertColor } from "@mui/material"`; `import CloseIcon from "@mui/icons-material"`
3. Custom types/interfaces: `import { AlertProps } from "../types"`
4. Custom components: `import TabPanel from "../components/TabPanel"`
5. Custom hooks: `import useInterval from "../hooks/useInterval"`
6. Custom utilities and API: `import { callApi } from "../api/Http"`
7. Styling (if using emotion/styled): Imports near top

**Path Aliases:**
- Relative paths used throughout: `../types`, `../components`, `../hooks`, `../api`
- No path aliases configured; imports are explicit relative paths
- Avoid circular dependencies by maintaining clear layering: components → hooks/api → types

## Error Handling

**Patterns:**
- Error state stored in component state: `const [error, setError] = useState("")`
- Errors displayed via error alerts: `<Alert message={error} severity={"error"} onClose={() => setError("")} />`
- API errors caught in try-catch blocks and passed to callback: `catch (error) { apiCall.onError((error as Error).message); }`
- Type assertions used when error type uncertain: `(error as Error).message`
- Validation errors set directly on state: `setError("You need to set a MessageGroupID...")`
- Empty string (`""`) used as sentinel value for "no error" state

## Logging

**Framework:** Console (no dedicated logging library)

**Patterns:**
- Limited logging in codebase; mostly through React DevTools and browser console
- No explicit log levels (debug/info/warn/error) used
- console.log could be used but isn't observed in current code
- Error messages shown to user via Alert component rather than logged

## Comments

**When to Comment:**
- Explain non-obvious accessibility workarounds: "Blur trigger button before opening dialog to prevent aria-hidden warning"
- Clarify MUI/browser behavior quirks
- Test setup comments explaining MUI transitions or async behavior
- Comments in tests explain intent of assertions, not just what code does

**JSDoc/TSDoc:**
- Not consistently used
- Type hints preferred over JSDoc comments
- Props interfaces serve as inline documentation

## Function Design

**Size:**
- Component functions typically 30-50 lines; handlers and utility functions 5-25 lines
- Large components like `Overview` (145 lines) break into multiple logical sections with internal helpers
- Handler functions extracted and named descriptively rather than inlined

**Parameters:**
- Components receive props as single destructured object or unnamed props argument
- Handlers accept single event parameter when possible: `handleChange(event: React.ChangeEvent<HTMLInputElement>)`
- Utility functions accept required data as arguments: `callApi(apiCall: ApiCall)`
- API callbacks use onSuccess/onError pattern rather than Promise chains

**Return Values:**
- Components return JSX
- Handlers return void (side effects via setState)
- Utility functions return data or void
- No implicit undefined returns; side-effect functions explicitly return void

## Module Design

**Exports:**
- Default exports for React components: `export default Alert`, `export default MessageItem`
- Named exports for utilities: `export { callApi }`
- Single responsibility per file: one component or one utility function/hook per file

**Barrel Files:**
- Types centralized in `frontend/types/index.tsx` exporting all interfaces
- No barrel files for components; direct imports used

## TypeScript Specifics

**Type Annotations:**
- All function parameters typed: `const useInterval = (callback: () => void, delay: any)`
- Return types inferred for simple functions; explicit for complex ones
- `any` type used sparingly (appears in `delay: any` and `onSuccess: any` for callbacks)
- `@ts-ignore` comments used when type system can't express requirements (5 instances found)
- Type assertions with `as` keyword when cast needed: `(error as Error).message`

**Generics:**
- Not heavily used; specific types preferred
- State arrays typed directly: `useState([] as Queue[])`
- Dictionary objects typed as `{ [key: string]: string }`

---

*Convention analysis: 2026-04-08*
