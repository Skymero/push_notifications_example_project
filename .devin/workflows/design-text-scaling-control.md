---
description: 
auto_execution_mode: 3
---

# Junior Dev Checklist — Text Scaling Control (React Native)

Short version: find Text nodes that break layouts under Large Text, fix single-line labels with `adjustsFontSizeToFit`/`numberOfLines`/`minimumFontScale`, protect paragraphs with wrapping/`flexShrink` or scroll, and only use `allowFontScaling={false}` for microcopy — always document why.

---

## 1) Locate risky Text usages

What to search for:

* Long literal Text or Text with raw fontSize

  * `rg "<Text[^>]*>[^<]{40,}" -n src`
  * `rg "fontSize\\s*:\\s*\\d+" -n src`
  * `rg "allowFontScaling\\s*=\\s*\\{?false\\}?" -n src`

Quick jscodeshift target idea (report-only): find `<Text>` nodes with inner text length > 40 or style objects with `fontSize` numeric.

Record findings as: `{file_path, line_start, line_end, snippet, why_it_breaks}`.

---

## 2) Fix single-line labels/headlines (preferred approach)

Goal: keep single-line labels readable but contained.

Action:

* For single-line headers/buttons/trailing labels:

  * Add `numberOfLines={1}`
  * Add `adjustsFontSizeToFit` and `minimumFontScale={0.85}`
  * If you already use `useWindowDimensions()`, factor `fontScale` into numeric sizing.

Copy-paste example:

```tsx
// Headline.jsx
import { Text } from 'react-native';
<Text
  numberOfLines={1}
  adjustsFontSizeToFit
  minimumFontScale={0.85}
  style={[styles.title, { fontSize: Math.round(24 / fontScale) }]}
>
  Very long page title that might otherwise overflow
</Text>
```

Notes:

* `minimumFontScale` range: `0.8–0.9` is typical; set by UX if needed.
* `adjustsFontSizeToFit` is iOS/Android cross-platform in RN (works for single-line scaling).

---

## 3) Protect multi-line paragraphs and long content

Goal: paragraphs should wrap/scroll instead of pushing UI off-screen.

Action:

* Ensure container allows wrapping and/or vertical scroll:

  * Use `flexShrink: 1` on text container to let it shrink if needed.
  * If content can be long, put it inside a `ScrollView`.
* Do NOT add `numberOfLines` for content meant to be fully readable unless truncation is acceptable.

Example:

```tsx
// Paragraph that can grow
<View style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={{ padding: 16 }}>
    <Text style={{ flexShrink: 1, lineHeight: 22 }}>
      Long paragraph text...
    </Text>
  </ScrollView>
</View>
```

---

## 4) Add/respect responsive font sizing (fontScale)

Goal: compute font sizes that won’t explode layout under large `fontScale`.

Options:

* Use `useWindowDimensions()` `fontScale`:

  ```js
  const { fontScale } = useWindowDimensions();
  const scaled = (size) => Math.round(size / fontScale);
  ```
* Or use `PixelRatio.getFontScale()`:

  ```js
  import { PixelRatio } from 'react-native';
  const scaleFont = (size) => Math.round(size / PixelRatio.getFontScale());
  ```
* Use these helpers for headline/static sizes; keep microcopy small but readable.

Example helper (add to `utils/typography.ts`):

```js
import { PixelRatio } from 'react-native';
export const scaleFont = (size) => Math.round(size / PixelRatio.getFontScale());
```

---

## 5) Audit `allowFontScaling={false}` usage

Guideline:

* `allowFontScaling={false}` should be rare — only microcopy (icons, very small UI, badge numbers) and documented.
* For every occurrence add a comment explaining justification.

Example comment:

```tsx
<Text allowFontScaling={false}>
  {/* allowFontScaling:false — micro copy for notification badge, accessibility not required */}
  7
</Text>
```

Action:

* Run `rg "allowFontScaling" -n` and add comment or remove it.

---

## 6) Rapid fixes & codemod hints (make safe, review required)

* Replace obvious single-line long `<Text>` with:

  * `numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}`
* For raw numeric `fontSize` entries, flag for review; consider replacing with `scaleFont()` if used project-wide.

jscodeshift hint (report-first):

* Match: `fontSize: <number>` in simple style objects → add `// REVIEW: consider scaleFont(...)` comment.

**Do not auto-apply wide changes without manual QA.**

---

---

## 9) Example “before → after” snippets

Before (problem):

```tsx
<Text style={{ fontSize: 20 }}>
  Very long screen title that will wrap and push UI down
</Text>
```

After (fix):

```tsx
import { useWindowDimensions } from 'react-native';
const { fontScale } = useWindowDimensions();
<Text
  numberOfLines={1}
  adjustsFontSizeToFit
  minimumFontScale={0.85}
  style={{ fontSize: Math.round(20 / fontScale), fontWeight: '700' }}
>
  Very long screen title that will wrap and push UI down
</Text>
```

Paragraph before:

```tsx
<Text style={{ fontSize: 16 }}>
  Very long paragraph...
</Text>
```

Paragraph after (allow scroll/wrap):

```tsx
<ScrollView contentContainerStyle={{ padding: 16 }}>
  <Text style={{ flexShrink: 1, lineHeight: 22 }}>
    Very long paragraph...
  </Text>
</ScrollView>
```

---

## 10) Deliverables for reviewer

* `findings_text_scaling.json` with `{file, lines, rule_id, snippet, suggested_fix}`


