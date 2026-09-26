---
description: Responsive Layout (Flexbox · Percentages · `aspectRatio`)
auto_execution_mode: 3
---

# Junior Dev Checklist — Responsive Layout (Flexbox · Percentages · `aspectRatio`)

Nice — here’s a practical, copy-pasteable checklist a junior dev can follow to find, fix, test, and ship the responsive layout fixes you described. For each task: where to look, expected outcome, exact steps, a commented code example, quick search/jscodeshift hints, and tests/QA items.


---

## Quick notes before you start

* Work on a feature branch: `feature/responsive-fixes/<ticket-or-short-desc>`.
* Run the app in dev mode (Expo or RN dev client) and Storybook (if present).
* Do one logical component or screen per commit to keep PRs reviewable.

---

# 1) Replace all hardcoded pixel values with percentages
No width: 375, height: 812, width: 320, padding: 16, margin: 8, etc. 

Replace all with percentage-based values ('50%', '100%', '25%') or relative units.

Steps
1. Search for all hardcoded pixel values in styles:
- rg "\b(width|height|padding|margin|top|bottom|left|right|fontSize|lineHeight)\s*:\s*\d{1,4}\b" src app components screens -n

2. For each hit decide:
- Full-width container → width: '100%'
- Half-width elements → width: '50%'
- Spacing (padding/margin) → Use percentage of container: padding: '2%', margin: '1%'
- Font sizes → Use percentage-based scaling: fontSize: '4%' (relative to container) or em/rem equivalents
- Heights → height: '100%' or percentage of parent container
3. Replace pixel values with percentages. Add // REVIEW comment if the percentage is an estimate.
4. Commit and test across different screen sizes.
```Code example (commented)
tsx
// BAD: hardcoded pixels — won't scale across devices
const styles = StyleSheet.create({
  container: { width: 375, height: 812, padding: 16, margin: 8 }
});
 
// GOOD: all percentage-based — scales proportionally
const styles = StyleSheet.create({
  container: { 
    width: '100%', 
    height: '100%', 
    padding: '2%', 
    margin: '1%' 
  }
});
```

## Tools / codemod hints
- Grep: rg "(width|height|padding|margin|fontSize|lineHeight):\s*\d+"
- jscodeshift: target style objects with numeric values and replace with percentage equivalents

## Tests
- Emulators: 320w, 375w, 430w, 768w. Confirm layout scales proportionally without horizontal scroll or clipping.
- Verify spacing, text, and dimensions maintain relative proportions across all screen sizes.

# 2) Prefer Flexbox for layout (add `flex:1` where appropriate)

**Location:** top-level screen containers, wrappers around scrollviews, header/footer containers
**Expected:** Root containers have `flex: 1` and children use `flex`, `alignItems`, `justifyContent`, not pixel nudges.

### Steps

1. Find screens with root `<View>` that lack `flex: 1`:

   * `rg "export default function .*\\(|const .* = \\(.*\\) =>" -n src | xargs -I{} rg "return\\s*\\(" -n {} -S` (or inspect `styles.container` usages)
2. Add `flex: 1` to root container styles.
3. Refactor siblings to use `flexDirection`, `justifyContent`, `gap` / spacing instead of fixed widths.
4. Commit & smoke-test scroll behavior.

### Code example (commented)

```tsx
// BAD: no flex on root, children may overflow
const styles = StyleSheet.create({
  container: { padding: 16 } // missing flex: 1
});

// GOOD: root fills screen so children lay out predictably
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 }
});
```

### Tests

* Ensure header/footer stick to edges and ScrollView scrolls. Try increasing content height.

---

# 3) Images must have `aspectRatio` or be constrained by container

**Location:** all `<Image>` and `<ImageBackground>` uses
**Expected:** Every image either has `aspectRatio` (preferred) or is constrained by parent container (width `'100%'` + known height or aspect).

### Steps

1. Find images:

   * `rg "<Image|ImageBackground" src app components screens -n`
2. For each image:

   * If style contains only `width` or only `height` → add `aspectRatio`.
   * If remote images with unknown ratio → wrap in container `width:'100%'` and set `aspectRatio` or compute ratio from metadata.
   * Always set `resizeMode` to `cover`/`contain` as UX requires.
3. Add `// REVIEW` when guessing aspect ratio.

### Code example (commented)

```tsx
// BAD: width only → source can overflow/ distort
<Image source={img} style={{ width: 200 }} />

// GOOD: responsive image keeps ratio and fills width
<View style={{ width: '100%', maxWidth: 600 }}>
  <Image source={img} style={{ width: '100%', aspectRatio: 16/9, resizeMode: 'cover' }} />
</View>
```

### Tests

* Swap in square / tall images and confirm no horizontal scroll and no distortion.

---

# 4) Use `alignSelf: 'stretch'` / parent `alignItems` for full-width children

**Location:** children within card/list/grid components
**Expected:** Children that should fill available width use `alignSelf: 'stretch'` instead of hardcoded width.

### Steps

1. Search for children with explicit width used to fill parent:

   * `rg "alignSelf|alignItems|width:\\s*['\"]?\\d+" src app -n`
2. Replace patterns where child should fill parent:

   * Set parent `alignItems: 'stretch'` and remove child width; or set `child { alignSelf: 'stretch' }`.
3. Test list items, cards, and form fields.

### Code example (commented)

```tsx
// BAD: card child hard-coded width
<View style={styles.card}><View style={{ width: 320 }} /></View>

// GOOD: stretch child to parent width
const styles = StyleSheet.create({ card: { alignItems: 'stretch' } });
// or directly on child:
<View style={{ alignSelf: 'stretch' }} />
```

### Tests

* Ensure cards center and fill available width at small and large screen sizes.

---

# 5) Tame text scaling (accessibility)

**Location:** long paragraphs, titles, buttons — any `<Text>` block
**Expected:** Text respects accessibility settings without breaking layout by using `adjustsFontSizeToFit`, `minimumFontScale`, `numberOfLines`, `flexShrink`, or responsive scale helpers.

### Steps

1. Find text uses and raw `fontSize` numbers:

   * `rg "fontSize\\s*:\\s*\\d+|<Text[^>]*>" src app -n`
2. For long UI text:

   * Use `numberOfLines` + `ellipsizeMode` when truncation is OK.
   * Use `adjustsFontSizeToFit` + `minimumFontScale` for single-line headlines.
   * For paragraphs, ensure container can wrap and scroll; add `flexShrink: 1`.
3. Avoid `allowFontScaling={false}` unless intentionally limiting.
4. Prefer a font helper:

   ```js
   import { PixelRatio } from 'react-native';
   const scaleFont = (size) => Math.round(size * PixelRatio.getFontScale());
   ```
5. Test with OS font size scaled to 1.5x and 2.0x.

### Code example (commented)

```tsx
// GOOD: headline that adjusts to large font size
<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.title, { fontSize: 20 / fontScale }]}>
  Headline
</Text>

// GOOD: paragraph that can wrap & shrink
<Text style={{ flexShrink: 1, lineHeight: 22 }}>
  Long paragraph text...
</Text>
```

### Tests

* On emulator: Settings → Accessibility → Larger Text (1.5x, 2.0x). Verify no overlap or off-screen text.

---

# 6) Use `useWindowDimensions()` and clamp for tablets / large screens

**Location:** large cards, dialogs, modal content, image galleries
**Expected:** Components adapt to available width and cap at sensible `maxWidth` to avoid enormous layouts.

### Steps

1. Identify large visual components (cards, modals).
2. Replace static max size with:

   ```js
   const { width } = useWindowDimensions();
   const cardWidth = Math.min(width - 32, 900);
   ```
3. Use `alignSelf: 'center'` to center on wide screens.

### Code example (commented)

```tsx
const { width } = useWindowDimensions();
const cardWidth = Math.min(width - 32, 900);
return <View style={{ width: cardWidth, alignSelf: 'center' }}>...</View>;
```

### Tests

* Test on tablet emulators: 768w, 1024w. Confirm card centers and keeps max width.

---

# 7) Replace unnecessary absolute positioning / top/left nudges

**Location:** modals, tooltips, custom overlays, notification badges
**Expected:** Only true overlays use absolute positioning (and use `StyleSheet.absoluteFillObject` + flex centering). Regular layout uses flex.

### Steps

1. Find absolute usage:

   * `rg "position\\s*:\\s*['\"]?absolute['\"]?|\\b(top|left|right|bottom)\\s*:\\s*\\d+" -n`
2. For overlays:

   * Use:

     ```js
     <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
       <View style={{ width: '90%', maxWidth: 600 }}>...</View>
     </View>
     ```
3. For layout nudges, remove absolute and rework with `margin/padding` or flex.
4. Add tests for orientation changes and large font scaling.

### Code example (commented)

```tsx
// BAD: fragile
<View style={{ position: 'absolute', top: 50, left: 20 }}>...</View>

// GOOD: centered overlay that adapts
<View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
  <View style={{ width: '90%', maxWidth: 600 }}>...</View>
</View>
```

### Tests

* Check overlay centers at 320w, 375w, 768w and under large font scaling.

---

# 8) Avoid huge fixed gutters — use scaled spacing

**Location:** global spacing tokens, component paddings
**Expected:** No huge paddings like `padding: 48` used as default; use modest base values and scale them.

### Steps

1. Search for large gutters:

   * `rg "padding\\s*:\\s*\\d{2,4}\\b|margin\\s*:\\s*\\d{2,4}\\b" -n`
2. Replace with variables or scale helpers:

   ```js
   const BASE = 16;
   const padding = Math.round(BASE * scale); // scale from device/window
   ```
3. Ensure spacing looks proportional on small & large screens.

### Tests

* Visual check on small phone and large tablet; spacing should feel balanced.


---

# Useful search & codemod recipes

* Ripgrep quick scans:

  * Fixed sizes: `rg "\b(width|height)\s*:\s*\d{2,4}\b" -n`
  * Absolute: `rg "position\s*:\s*['\"]?absolute['\"]?" -n`
  * Image tags: `rg "<Image|ImageBackground" -n`
  * Text fontSize: `rg "fontSize\s*:\s*\d+" -n`
* Simple jscodeshift idea (manual review always):

  * Replace `width: <number>` with `width: '100%' // REVIEW` for simple style objects that contain only width/height.
