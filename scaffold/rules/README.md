# Rules

Coding standards agents load **only when a task matches** — one file per
topic, e.g. `typescript.md`, `components.md`, `testing.md`. Reference each
file from AGENTS.md with its trigger:

```markdown
- **IF YOU WORK ON FRONTEND COMPONENTS** → load `.agents/rules/components.md`.
```

Keep rules short and concrete; delete ones nobody follows.
