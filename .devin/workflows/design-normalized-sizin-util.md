---
description: 
auto_execution_mode: 3
---

# Junior Dev Checklist — Normalized Sizing Utility (`ms()` / `scale()`)

Goal: make UI sizing (fonts, margins, paddings, gaps, icon sizes) use a single normalized sizing helper so layouts feel balanced across tiny → large devices.

---

## 1) Verify `ui/scale.ts` exists

* Look for file: `src/ui/scale.ts`, `ui/scale.ts`, or similar.
* It should export at least `scale(size)` and `ms(size, factor?)` (example in spec).
* If missing, add `ui/scale.ts` using the provided snippet and document it in README/styleguide.

Example `ui/scale.ts`:

```ts
import { PixelRatio, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
const guidelineBaseWidth = 375;

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const ms = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;
```

---

## 2) Find raw numeric sizes to replace

Search for numeric literals used for layout/typography:

* Styles and inline:
  `rg "\b(fontSize|margin|padding|gap|height|width)\s*:\s*\d+\b" -n src`
* JSX inline styles:
  `rg "style=\{\{[^}]*\d+[^}]*\}\}" -n src`
* Long list of candidates: `rg "\b\d{2,3}\b" -n src | rg -v "z-index|opacity|lineHeight"`

Record each hit as: `{file, lines, snippet, suggested_replacement}`.

---

## 3) Replace patterns (preferred mappings)

* Fonts: `fontSize: 16` → `fontSize: ms(16)` (or `Math.round(ms(16) / fontScale)` if handling accessibility explicitly)
* Margins / paddings / gaps: `marginTop: 24` → `marginTop: ms(24)`
* Icon sizes (small, deliberate constants) — **leave** if UX requires pixel-perfect icons; document with `// REVIEW: fixed icon size`.

Before:

```js
const styles = StyleSheet.create({
  title: { fontSize: 18, marginBottom: 16 },
});
```

After:

```js
import { ms } from 'ui/scale';
const styles = StyleSheet.create({
  title: { fontSize: ms(18), marginBottom: ms(16) },
});
```

Notes:

* Prefer `ms()` for most UI tokens. Use `scale()` when you want linear scaling without the ms dampening.
* Add `// REVIEW` if you guessed the correct replacement or if a value affects non-layout logic.

---

## 4) Watch for mixed usage inside same file

* If a file uses `ms(...)` in some style fields but raw numbers elsewhere, normalize the file.
* Search for mixes:
  `rg "ms\\(|fontSize\\s*:\\s*\\d+" -n src` and manually inspect matches.

If you intentionally keep some raw numbers, add comment:

```js
// REVIEW: 32px fixed to match design token for logo
width: 32
```

---

## 5) Coordinate with font scaling (accessibility)

* For text, check if `fontScale` is handled:

  * Bad: `fontSize: ms(16)` only (may still blow up under accessibility).
  * Better: use `useWindowDimensions().fontScale` or `PixelRatio.getFontScale()` to adjust; or use `adjustsFontSizeToFit` on single-line headlines.
    Example:

```js
const { fontScale } = useWindowDimensions();
<Text style={{ fontSize: Math.round(ms(16) / fontScale) }} />
```

* Flag text-only components that need `adjustsFontSizeToFit` or `numberOfLines`.

---

## 6) Codemod approach (report-first)

* Create codemod candidates only for trivial single-line style literals:

  * `fontSize: 16` → `fontSize: ms(16) // REVIEW`
  * `marginTop: 24` → `marginTop: ms(24) // REVIEW`
* **Do not auto-apply** broadly — run codemod in a branch, visually inspect changes, and revert anything that looks wrong.

Commands to collect candidates:

* `rg "fontSize\\s*:\\s*\\d+" -n src`
* `rg "margin|padding|gap\\s*:\\s*\\d+" -n src`

