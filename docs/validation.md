# Validation scope

Validated on 2026-11-08 with Node 24: TypeScript and production build passed, **8 backend/SDK tests passed**, and **8 browser tests passed** across desktop and mobile Chromium. The browser checks also verify that refreshing the collection preserves the editing baseline and rejects a stale update.

The application includes backend tests for version changes, no-ops, preserved history, stale updates, ownership boundaries, archival confirmation, validation, persistence, and concurrent-operation rejection.

The official SDK transport test mocks HTTP responses while exercising actual SDK methods, beta headers, expected-version request fields, and cursor pagination for both agent listing and version history.

Desktop and mobile browser checks cover the practical lifecycle, no-op and changed updates, history comparison, archive confirmation/read-only state, all 15 highlighted method/field examples, UML step selection, the six-question quiz, stored text size, literal rendering of user input, and HTTP request validation.

No real cloud create, update, or archive operation is used by these automated tests. A live management run requires an account-specific Managed Agents-enabled credential and available model. Screenshots show the simulated management demo.
