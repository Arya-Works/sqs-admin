# Codebase Concerns

**Analysis Date:** 2026-04-08

## Tech Debt

**Hardcoded AWS Credentials in Client Config:**
- Issue: Static credentials are hardcoded in the AWS client configuration
- Files: `server/aws/clientConfig.go` (lines 20-22)
- Impact: Security vulnerability - credentials are never rotated and visible in source code. Development credentials leak if repository is compromised.
- Fix approach: Replace hardcoded credentials with environment variable loading or AWS credential chain. Use AWS SDK's default credential providers or assume role patterns.

**Implicit Error Handling in JSON Parsing:**
- Issue: Multiple `json.Unmarshal` calls ignore errors without logging or propagating them
- Files: `server/handler/handler.go` (lines 33, 43), `server/aws/clientConfig.go`
- Impact: Malformed JSON payloads silently fail, leading to nil pointers and incomplete data structures. Debugging becomes difficult when requests are dropped without error reporting.
- Fix approach: Check all `json.Unmarshal` results and return errors to caller. Log parsing failures with request context.

**Errors Logged But Not Returned in SQS Operations:**
- Issue: `ListQueues()` and `GetMessages()` in `server/aws/sqsClient.go` log errors but return empty slices instead of propagating errors
- Files: `server/aws/sqsClient.go` (lines 30-39, 64-66)
- Impact: API returns empty queues/messages on failure, indistinguishable from no queues existing. Frontend receives silent failures.
- Fix approach: Modify function signatures to return errors. Update callers to handle error cases properly.

**Fatal Errors Crash Server in Request Handlers:**
- Issue: `log.Fatal()` called during request handling in `unpackRequestPayload()` and `unpackResponsePayload()`
- Files: `server/handler/handler.go` (lines 31, 41)
- Impact: Single malformed request crashes the entire server. No graceful degradation or error response to client.
- Fix approach: Return errors instead of calling `log.Fatal()`. Let HTTP handlers return 400/500 responses.

**Type Assertions with `@ts-ignore` Comments:**
- Issue: Two `@ts-ignore` comments suppress TypeScript errors without safe fallbacks
- Files: `frontend/components/MessageItem.tsx` (lines 37-38, 40-41, 63-64)
- Impact: Accessing potentially undefined properties on message attributes. Runtime errors if attributes are missing.
- Fix approach: Properly type-guard attributes before access. Update types to reflect optional fields correctly.

**Overly Permissive Type Annotations:**
- Issue: Multiple `any` type annotations used throughout type definitions
- Files: `frontend/types/index.tsx` (lines 20, 62-63)
- Impact: Loss of type safety at API boundaries. Errors in callback signatures not caught at compile time.
- Fix approach: Replace `any` with specific types. Define proper callback interfaces for `onSuccess` and `message`.

## Known Bugs

**Custom Message Attributes Overwrite MessageGroupId:**
- Symptoms: When setting both custom attributes and MessageGroupId on a FIFO queue, custom attributes may be lost
- Files: `frontend/components/SendMessageDialog.tsx` (lines 54-71)
- Trigger: Setting MessageGroupId on FIFO queue, then adding custom attributes - attributes get overwritten
- Workaround: Add custom attributes before setting MessageGroupId, or modify payload construction to merge attributes

**Race Condition on Queue Selection Change:**
- Symptoms: Wrong queue's messages appear temporarily when rapidly switching between queues
- Files: `frontend/views/Overview.tsx` (useEffect dependencies on lines 49-52)
- Trigger: Quickly clicking between queue list items before previous message fetch completes
- Workaround: Wait for message loading to complete before switching queues

**Null Pointer Risk in Message Attributes Access:**
- Symptoms: Potential runtime error when messageAttributes is undefined
- Files: `frontend/components/SendMessageDialog.tsx` (line 65)
- Trigger: Navigating to FIFO queue after creating it
- Current mitigation: Optional chaining prevents crash but silently drops attributes

## Security Considerations

**Hardcoded Credentials in Source Code:**
- Risk: AWS credentials permanently visible in repository history even if later deleted
- Files: `server/aws/clientConfig.go` (line 22)
- Current mitigation: Only work with LocalStack in dev (but credentials are hardcoded anyway)
- Recommendations: Use AWS credential chain or environment variables. Never commit credentials. Rotate if accidentally exposed.

**CORS Allows All Origins:**
- Risk: Any website can make requests to this SQS admin UI, enabling CSRF attacks
- Files: `server/main.go` (line 52)
- Current mitigation: None
- Recommendations: Restrict CORS to specific origins. Use CSRF tokens if running on public internet. Add authentication layer.

**No Request Validation:**
- Risk: API accepts arbitrary action strings, though switch statement limits them. No input sanitization on queue names, messages.
- Files: `server/handler/sqsHandler.go` (lines 32-80)
- Current mitigation: Switch statement prevents unknown actions
- Recommendations: Validate all inputs (queue names, message bodies, attributes). Limit message size. Implement rate limiting.

**Exposed Debug Information:**
- Risk: Error messages and logs may expose internal AWS details to clients
- Files: `frontend/api/Http.tsx` (line 24)
- Current mitigation: Generic error display in UI
- Recommendations: Sanitize error messages before sending to client. Log full details server-side only.

## Performance Bottlenecks

**N+1 Query Pattern in ListQueues:**
- Problem: Fetches all queue URLs, then makes individual API call for each queue's attributes
- Files: `server/aws/sqsClient.go` (lines 28-48)
- Cause: Loop calls `getQueueAttributes()` for each queue, one at a time
- Improvement path: Batch attribute requests if AWS SDK supports it, or limit queue count. Add caching with TTL.

**Polling Every 3 Seconds Without Backoff:**
- Problem: Frontend continuously fetches messages every 3 seconds regardless of activity or queue depth
- Files: `frontend/views/Overview.tsx` (lines 45-47)
- Cause: Fixed interval with `useInterval` hook, no exponential backoff or queue idle detection
- Improvement path: Implement smart polling - longer intervals when queue is empty, shorter when full. Stop polling when component unmounts.

**Manual setTimeout for State Reload:**
- Problem: Hard-coded 1 second delays after queue operations, poor UX if operations take longer
- Files: `frontend/views/Overview.tsx` (lines 108-110, 135-137)
- Cause: No event-based notification from backend, polling-based refresh
- Improvement path: Use WebSockets or server-sent events for real-time updates. Implement actual queue operation status checks.

**No Result Pagination:**
- Problem: Loads all queue messages at once (hard-capped at 10), no pagination for large queues
- Files: `server/aws/sqsClient.go` (line 57)
- Cause: Fixed MaxNumberOfMessages=10 hardcoded
- Improvement path: Implement cursor-based pagination, allow configurable batch size, lazy-load messages.

## Fragile Areas

**HTTP Endpoint Handler Function:**
- Files: `server/handler/sqsHandler.go` (lines 19-85)
- Why fragile: Large switch statement handling multiple actions. Adding new actions requires modifying this function. Request payload unpacking tightly coupled to handler. No validation before action dispatch.
- Safe modification: Extract each action into separate function. Create action registry/map. Add validation middleware.
- Test coverage: `sqsHandler_test.go` tests basic flow but doesn't cover all error paths

**Frontend State Management in Overview:**
- Files: `frontend/views/Overview.tsx` (entire file, 312 lines)
- Why fragile: Multiple interdependent state variables (queues, messages, reload, error, disabledStatus). List selection logic uses array indexing. useEffect dependencies not fully correct (line 51-52 missing dependencies).
- Safe modification: Extract queue/message fetching into custom hook. Use state reducer for related state. Add proper dependency arrays.
- Test coverage: `Overview.test.tsx` mocks API but doesn't test state transitions fully

**Message Attribute Parsing:**
- Files: `frontend/components/MessageItem.tsx` (lines 22-27, 62-64), `server/aws/sqsClient.go` (lines 129-146)
- Why fragile: JSON parsing in try-catch with silent fallback. No validation of attribute structure. Custom attributes serialized as JSON string then parsed back.
- Safe modification: Create typed attribute parsers. Validate structure on both serialize/deserialize. Use proper type guards.
- Test coverage: Tests don't cover malformed JSON attribute cases

## Scaling Limits

**Single-Threaded Context Handling:**
- Current capacity: All AWS operations use `context.TODO()` with no timeout
- Limit: Long-running operations or hung connections block indefinitely
- Files: `server/aws/sqsClient.go` (lines 18, 22, 52, 91, 97, 103, 126)
- Scaling path: Replace `context.TODO()` with proper context with timeouts. Make timeout configurable per environment.

**No Connection Pooling Configuration:**
- Current capacity: AWS SDK uses default client configuration
- Limit: High concurrency may exhaust connection limits
- Scaling path: Add client configuration for max connections, idle timeout, retry policy. Profile under load.

**In-Memory Queue List:**
- Current capacity: All queues held in frontend state
- Limit: 1000+ queues becomes unwieldy in UI
- Scaling path: Implement pagination, virtual scrolling, search filtering server-side.

## Dependencies at Risk

**AWS SDK Version Management:**
- Risk: Using `github.com/aws/aws-sdk-go-v2` but no explicit version pinning in module discovery code shown
- Impact: Major version updates could break API compatibility
- Migration plan: Use Go modules with explicit version constraints. Test SDK updates before deploying.

**Material-UI 7.x Usage:**
- Risk: Recent major version, potential breaking changes in minor updates
- Impact: Component API changes could break rendering
- Migration plan: Pin to specific version, test before updating, use deprecation notices before upgrade.

## Missing Critical Features

**No Authentication/Authorization:**
- Problem: Anyone with URL access can create/delete/purge queues and read all messages
- Blocks: Cannot safely use in shared/team environment. No audit trail of who made changes.
- Recommendation: Add API key validation, optional JWT support, audit logging.

**No Queue Message Deletion:**
- Problem: Only able to purge entire queue, cannot delete individual messages
- Blocks: Cannot recover from accidental message processing. No manual message removal.
- Recommendation: Add delete message endpoint and UI button per message.

**No Bulk Operations:**
- Problem: Cannot perform actions on multiple queues at once
- Blocks: Managing multiple related queues inefficient
- Recommendation: Add checkbox selection, bulk delete/purge operations.

**No Message Retry/Dead Letter Queue Support:**
- Problem: FIFO deduplication and message group management supported but no retry/DLQ visibility
- Blocks: Cannot inspect dead letter queues or retry failed messages
- Recommendation: Add DLQ selection, retry message sending with configurable delays.

## Test Coverage Gaps

**Error Path Testing Incomplete:**
- What's not tested: AWS API failures (network timeout, invalid credentials, throttling), JSON parsing failures
- Files: `frontend/views/Overview.test.tsx`, `server/handler/sqsHandler_test.go`
- Risk: Error handlers not exercised. Silent failures in production.
- Priority: High - error paths most likely to cause issues

**Context Cancellation Not Tested:**
- What's not tested: Behavior when requests are cancelled, context deadlines exceeded
- Files: `server/aws/sqsClient.go`
- Risk: Hung requests, incomplete state, memory leaks possible
- Priority: Medium - relevant under high load

**Concurrent Queue Operations:**
- What's not tested: Racing requests to same queue, state consistency under concurrency
- Files: Frontend state mutation during concurrent API calls
- Risk: Race conditions, inconsistent UI state
- Priority: Medium - harder to reproduce but impacts reliability

**Invalid Input Handling:**
- What's not tested: Malformed queue names, oversized messages, invalid JSON in custom attributes
- Files: `server/handler/sqsHandler.go`, frontend dialogs
- Risk: Server crashes or silent failures
- Priority: High - user-facing impact

---

*Concerns audit: 2026-04-08*
