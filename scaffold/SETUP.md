# Finish the loopboard setup

`loopboard init` copied the workflow into this repo. Finish it, then delete
this file.

1. **AGENTS.md.** Fill in "Project overview" (two or three sentences) and
   "Build & test" with this repo's real install, dev, test and **verify**
   commands — look at package.json, Makefile, CI config. Verify is what the
   session loop runs after every issue; if the repo has none, combine
   type-check/lint and tests into one command and say so. If loopboard is a
   dev dependency, add `loopboard check` to verify so duplicate issue numbers
   fail fast. Don't edit between the `loopboard:start` / `loopboard:end`
   markers.
2. **Existing agent instructions.** If CLAUDE.md, `.cursorrules` or similar
   already held instructions before setup, keep them: move repo-specific
   rules into AGENTS.md (outside the markers) or `.agents/rules/`, and make
   CLAUDE.md import AGENTS.md (`@AGENTS.md`).
3. **Existing work.** If the repo tracks work elsewhere (a TODO.md, issue
   lists in docs), **ask the user** before importing anything as
   `.agents/issues/` files.
4. **Check.** Run the verify command, then tell the user to run
   `npx loopboard` to see the board, and what you changed.
5. Delete `.agents/SETUP.md`.
