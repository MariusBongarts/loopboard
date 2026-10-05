# 14. Look and feel

> Neutral grays, one violet accent and Inter, in light and dark (#0045). The
> tokens, primitives and rules live in the
> [Brand Kit](../design/Brand%20Kit.html).

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Light, dark or the system's choice | ✅ | [`14-look-and-feel.spec.ts`](../../tests/e2e/14-look-and-feel.spec.ts) |
| Readable in both themes | 🟡 | `pnpm contrast` (in `pnpm verify`) checks every text, accent, tone and status token pair; screens are compared in [`visual.spec.ts`](../../tests/e2e/visual.spec.ts) (macOS baselines) |
| Nothing leaves the machine | ✅ | `14-look-and-feel.spec.ts`: no request to another host; fonts are self-hosted |

### Scenario: Light, dark or the system's choice

```
GIVEN Settings (the gear at the bottom of the rail, or "Settings" in ⌘K)
WHEN I pick System, Light or Dark under Theme
THEN the theme changes at once; ⌘K's "Theme" action cycles
    system → dark → light
AND the choice is remembered per browser and applied before the first paint
    (no flash of the wrong theme)
AND on "System", the theme follows the OS setting live
```

### Scenario: Readable in both themes

```
GIVEN either theme
THEN body text, secondary text, the accent and every project / label tone meet
    WCAG AA against their background, meta text and status icons at least 3:1
AND the main screens (board, issue panel and page, menus, editor, list, projects, specs, Help, ⌘K) match
    their approved screenshots
```

### Scenario: Nothing leaves the machine

```
WHEN I use loopboard
THEN no request goes to any host but the local server — fonts are bundled,
    there is no analytics, no CDN
```
