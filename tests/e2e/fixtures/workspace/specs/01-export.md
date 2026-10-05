# 1. Export

## E2E coverage

| Scenario | Status | Notes |
|---|---|---|
| Export everything | ✅ | |
| Export one project | ❌ | |

### Scenario: Export everything

```
GIVEN data exists
WHEN I click Export
THEN a file downloads
```

### Scenario: Export one project

```
GIVEN a project is selected
WHEN I click Export
THEN only that project downloads
```
