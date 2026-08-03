---
trigger: always_on
---

title: Virexo Phase description: Implements one controlled Virexo development phase. --- 1. Read the Always On Virexo workspace rule. 2. Read `docs/BUILD_STATUS.md`. 3. Inspect relevant existing files. 4. Restate the requested phase internally as acceptance criteria. 5. Create an implementation plan before changing code. 6. Implement only the requested scope. 7. Run relevant lint, tests and builds. 8. Use browser verification when a UI is involved. 9. Fix failures introduced by this phase. 10. Update `docs/BUILD_STATUS.md`. 11. Return only the response structure required by the workspace rule. 12. Stop.