---
description: 
auto_execution_mode: 3
---

# Junior Dev Checklist — Responsive Layout Fixes (React Native)

Nice — below is a focused, actionable checklist a junior dev can follow for each of the layout problems you care about. For each task I give: where to look, expected outcome, step-by-step instructions, a commented code example, simple grep/jscodeshift hints to find occurrences, tests to run, and a PR/QA checklist.

---

## Task 1 — Remove hardcoded widths/heights (`width: 375`, `height: 812`, etc.)

**Location:** `src/**`, `app/**`, `components/**`, `screens/**`
**Expected outcome:** No numeric device-specific widths/heights in styles. Use relative sizing (`'100%'`, `maxWidth`, `flex`, or `useWindowDimensions`) instead.

### Steps

1. Search for numeric widths/heights:

   * `rg "width:\\s*\\d{2,4}\\b|height:\\s*\\d{2,4}\\b" src app components screens`
2. For each hit, determine intent:

   * Is it a full-width container? → replace with `width: '100%'` or use `flex: 1`.
   * Is it a fixed visual (card) that should be capped? → use `maxWidth` with responsive clamp.
3. If component must limit size, use `useWindowDimensions()` or helper `clampWidth()`:

   * `const { width } = useWindowDimensions(); const cardWidth = Math.min(width - 32, 600)`
4. Run app on multiple emulators/devices to verify layout.
5. Commit with descriptive message and create PR.

### Code example (replace hardcoded width)

```js
// BAD: hardcoded device width that will break on smaller phones
const styles = StyleSheet.create({
  hero: { width: 375, height: 200 } // BAD: assumes iPhone 11 width
});

// GOOD: responsive width using useWindowDimensions and max width clamp
import { useWindowDimensions } from 'react-native';
function Hero() {
  const { width } = useWindowDimensions(); // get current device width
  const heroWidth = Math.min(width - 32, 600); // clamp for large screens
  return <View style={{ width: heroWidth, aspectRatio: 375/200 }} />;
}
```

### Quick codemod / grep hints

* Grep/ripgrep: `rg "width:\\s*\\d{2,4}\\b" -n src app components screens`
* jscodeshift candidate: convert `width: <number>` inside simple style objects to `width: '100%'` with `// REVIEW` comment (manual confirm recommended).

### Tests

* Emulators: iPhone SE (320×568), iPhone 11/12 (375×812), Pixel XL (412×915).
* Orientation: portrait/landscape.
* Verify no horizontal overflow, no clipped content.

---

## Task 2 — Replace fragile absolute positioning / fixed `top/left`

**Location:** `components/**`, `screens/**`, `modals/**`
**Expected outcome:** Overlay/positioned elements use centered containers, flexbox, padding, or percentage insets instead of hard-coded `top/left` offsets.

### Steps

1. Find occurrences:

   * `rg "position\\s*:\\s*['\"]?absolute['\"]?|top:\\s*\\d{1,4}\\b|left:\\s*\\d{1,4}\\b" src app components screens`
2. For each overlay, ask: is it an overlay (modal, tooltip, toast) or layout nudge?

   * Overlays: wrap in a full-screen `View` with `justifyContent: 'center'` / `alignItems: 'center'` and control inner size via `%` or `maxWidth`.
   * Layout nudge: convert to `margin`/`padding` or flex-based layout.
3. Replace `top: N` with responsive approach or `insets` + `%`.
4. Test across devices and font scaling.

### Code example (center overlay)

```js
// BAD: fragile absolute offsets
<View style={{ position: 'absolute', top: 50, left: 20 }}>
  <Text>Tooltip</Text>
</View>

// GOOD: responsive overlay centered using flexbox
<View style={{ ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' }}>
  <View style={{ width: '90%', maxWidth: 360, padding: 12 }}>
    <Text>Tooltip</Text>
  </View>
</View>
```

### Tests

* Confirm overlay remains centered and accessible in portrait/landscape and large font scaling.
* Check on small screens: ensure inner content scrolls if necessary.

---

## Task 3 — Remove negative margins

**Location:** `components/**`, `screens/**`
**Expected outcome:** No `marginTop: -8` or similar. Layout spacing handled with padding, flex, gap, or restructured components.

### Steps

1. Find negatives:

   * `rg "margin(?:Top|Bottom|Left|Right)?\\s*:\\s*-\\d+|margin:\\s*-\\d+" src app components screens`
2. For each find:

   * Understand why negative margin exists (alignment, stacking).
   * Replace by reordering elements, using `position:'absolute'` responsibly (only for overlays) or by adjusting container padding and `alignItems`/`justifyContent`.
3. If the negative margin is used for overlapping visuals (icon over image), use `position: 'relative'` + controlled `transform` or adjust parent stacking context with zIndex and relative sizes.
4. Verify visually in multiple sizes.

### Code example (remove nudge)

```js
// BAD: negative margin hack
<View style={{ marginTop: -8 }}>
  <Text>Title</Text>
</View>

// GOOD: use container spacing and alignment
<View style={{ paddingTop: 8 }}>
  <Text style={{ marginTop: 0 }}>Title</Text>
</View>
```

### Tests

* Re-check layout when content grows (long titles, larger fonts).
* Verify no overlap or unexpected shifts.

---

## Task 4 — Ensure images have aspectRatio or constrained sizing

**Location:** any use of `<Image>` or `<ImageBackground>` under `components/**`, `screens/**`
**Expected outcome:** Every image has either `aspectRatio` or fixed/constrained `width` + `height` derived from container or metadata; `resizeMode` set appropriately.

### Steps

1. Find image uses:

   * `rg "<Image[^>]*|Image source=|require\\(" src app components screens`
2. For each `<Image>`:

   * If only `width` or only `height` present → add `aspectRatio`.
   * If dynamic image (remote) → use container with `width: '100%'` + `aspectRatio` or compute aspect from known metadata.
   * Always set `resizeMode` (`cover`/`contain`) appropriate to the UX.
3. Add `accessible` props and `alt`/`accessibilityLabel` where needed.
4. Test images of varying sizes (landscape/portrait sources).

### Code example (add aspectRatio)

```js
// BAD: image with only numeric width
<Image source={img} style={{ width: 200 }} />

// GOOD: responsive image with aspectRatio and resizeMode
<View style={{ width: '100%', maxWidth: 600 }}>
  <Image source={img} style={{ width: '100%', aspectRatio: 16/9, resizeMode: 'cover' }} />
</View>
```

### Tests

* Load tall and wide images; confirm no overflow and correct cropping.
* Verify portrait/landscape orientation and small-screen scaling.

---

## Task 5 — Add `flex: 1` to top-level parent containers where missing

**Location:** `screens/**`, `pages/**`, root `View` components
**Expected outcome:** Screen containers occupy full screen so children layout properly; `ScrollView` children contain and scroll as expected.

### Steps

1. Find screen components that return a root `<View>` without `flex: 1`:

   * `rg "export default function .*\\(|const .* = \\(.*\\) =>" -n src app screens | xargs -I{} rg "return\\s*\\(" -n {} -S`
   * Or search for `<View style={styles.container}>` and inspect `styles.container`.
2. Add `flex: 1` to style objects for screen-level containers and top-level scrollable layouts.
3. Check `ScrollView` usage: wrap `ScrollView` inside `flex: 1` container or use `contentContainerStyle` for content sizing.
4. Run the screens & test scroll behavior.

### Code example (add flex:1)

```js
// BAD: container without flex, children may overflow
const styles = StyleSheet.create({
  container: { padding: 16 } // missing flex: 1
});
function MyScreen() {
  return <View style={styles.container}><Text>...</Text></View>;
}

// GOOD: guarantee full-screen container
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 } // flex:1 added to fill screen
});
function MyScreen() {
  return <View style={styles.container}><Text>...</Text></View>;
}
```

### Tests

* Verify footer/header anchored correctly.
* Ensure `ScrollView` scrolls and contents don’t float off-screen.

---

## Task 6 — Protect against font scaling (accessibility)

**Location:** `components/**`, `screens/**`, any `<Text>` blocks with long paragraphs
**Expected outcome:** Large accessibility font settings do not cause overflow or broken layout. Use wrapping, `numberOfLines`, responsive font helpers, or scalable layout.

### Steps

1. Find suspicious `Text` usages and numeric `fontSize`:

   * `rg "fontSize\\s*:\\s*\\d{1,3}\\b|<Text[^>]*>" src app components screens`
2. For long paragraphs:

   * Use `numberOfLines` (where truncation is appropriate) or ensure the container has `flexWrap` and can expand/scroll.
3. Implement a font-scaling helper for consistent scaling:

   * small helper: `scaleFont = (size) => Math.round(size * fontScale * baseRatio)` (or use `react-native-size-matters` / `react-native-responsive-fontsize`).
4. Avoid `allowFontScaling={false}` except for microcopy or icons; prefer accessible scaling.
5. Add tests using emulator font scaling settings.

### Code example (responsive font)

```js
// BAD: fixed font that will break under large accessibility settings
<Text style={{ fontSize: 16 }}>Long paragraph text that might overflow</Text>

// GOOD: responsive font + wrapping + optionally limit lines for UI constraints
import { PixelRatio } from 'react-native';
const scaleFont = (size) => Math.round(size * PixelRatio.getFontScale());
<Text style={{ fontSize: scaleFont(16), flexShrink: 1 }} numberOfLines={3} ellipsizeMode="tail">
  Long paragraph text that will wrap and be truncated safely
</Text>
```

### Tests

* On device/emulator set Accessibility → Larger Text to 1.5x and 2.0x; check all screens.
* Confirm no clipped text, overlapping elements, or off-screen content.

---

## Append this checklist to the changelog
### PR & QA Checklist (applies to all tasks)


* [ ] Branch name: `auto/responsive-fix/<ticket-or-short-desc>` (or use template `auto/responsive-fix/{timestamp}`).
* [ ] Commit messages: `fix(responsive): <short desc> — rule:<hardcoded|absolute|image|flex|font>`
* [ ] Include in PR description:

  * Summary of changes
  * Files changed and rules addressed
  * Screenshots before/after at multiple device sizes (320, 375, 430 widths)
  * Any manual review items still outstanding
* [ ] CI: run unit tests (if present) and ESLint/Prettier.
* [ ] Manual QA:

  * Test pages listed in `manual_review_guidance` (headers, footers, modals).
  * Run the emulator list from the JSON (iPhone SE, iPhone 11, iPhone 14 Pro Max, small Android).
  * Font scaling checks: normal, 1.5x, 2.0x.
  * Orientation checks (portrait/landscape).
* [ ] Assign reviewer(s) who understand layout (frontend lead / mobile architect).
* [ ] After approvals, merge & monitor crash/visual regressions in staging.

---

## Helpful tools & quick commands

* Find problematic styles:

  * `rg "width:\\s*\\d|height:\\s*\\d|position:\\s*'absolute'|marginTop:\\s*-[0-9]" -n src app components screens`
* Find `<Image>`:

  * `rg "<Image" -n src app components screens`
* Quick codemod starter (jscodeshift): create transforms that add `// REVIEW` comments where replacements happen — **always** require manual review before auto-apply.
* Useful debugging libs:

  * `react-native-debugger` & `Flipper` (layout inspector), `useWindowDimensions`, and `SafeAreaView`.
