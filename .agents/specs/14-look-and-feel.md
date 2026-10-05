# 14. Look and feel

> Warm paper, ink and one ember accent, in light and dark. The tokens and
> their rules live in the [Brand Kit](../design/Brand%20Kit.html).

## E2E coverage

Status legend in [`_specs.md`](_specs.md#e2e-coverage).

| Scenario | Status | Notes |
|---|---|---|
| Light, dark or the system's choice | ✅ | [`14-look-and-feel.spec.ts`](../../tests/e2e/14-look-and-feel.spec.ts) |
| Readable in both themes | 🟡 | `pnpm contrast` (in `pnpm verify`) checks every text/chip token pair against WCAG AA; screens are compared in [`visual.spec.ts`](../../tests/e2e/visual.spec.ts) (macOS baselines) |
| Nothing leaves the machine | ✅ | `14-look-and-feel.spec.ts`: no request to another host; fonts are self-hosted |

### Scenario: Light, dark or the system's choice

```
GIVEN the theme button at the bottom of the rail (◐ system, ☾ dark, ☀ light)
WHEN I click it
THEN the theme cycles system → dark → light → system, and ⌘K has the same
    action
AND the choice is remembered per browser and applied before the first paint
    (no flash of the wrong theme)
AND on "system", the theme follows the OS setting live
```

### Scenario: Readable in both themes

```
GIVEN either theme
THEN body text, secondary text and every status / project / label chip meet
    WCAG AA against their background
AND the main screens (board, drawer, editor, list, projects, Help, ⌘K) match
    their approved screenshots
```

### Scenario: Nothing leaves the machine

```
WHEN I use loopboard
THEN no request goes to any host but the local server — fonts are bundled,
    there is no analytics, no CDN
```
