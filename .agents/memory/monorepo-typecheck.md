---
name: Monorepo browser library typechecking
description: TypeScript lib settings needed by generated browser API clients.
---

Generated browser API clients can use `Headers.entries()`, which requires `dom.iterable` in the client library TypeScript `lib` list. Keep that alongside `dom` when adding or regenerating client code.

**Why:** The generated client can be valid at runtime but fail the workspace composite typecheck if iterable DOM types are omitted.

**How to apply:** If codegen introduces `Headers` iterator errors, fix the shared client library compiler lib settings before changing generated files.