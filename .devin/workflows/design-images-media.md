---
description: 
auto_execution_mode: 1
---

# Junior Dev Checklist — Image & Media Containment (React Native)

Short: find images/videos/backgrounds that can overflow, fix by adding `aspectRatio` or constraining containers (`width:'100%'` + `maxWidth`), set appropriate `resizeMode` (`contain` for logos, `cover` for backgrounds), avoid huge fixed heights/absolute positioning, and add accessibility labels. Work one component/screen per PR.

---

## Quick expectations

* Every image/video either:

  * has `aspectRatio` **and** `resizeMode`, **or**
  * is inside a constrained container (e.g. `width: '100%'` + `maxWidth`) that determines its height.
* Backgrounds use `ImageBackground` (or controlled flex Image) with `flex:1`, `width:'100%'`, `height:'100%'`, `resizeMode='cover'`.
* No large `height: 1000` or `position: 'absolute'` images that overlap UI.
* Remote images are wrapped or set with a computed aspect ratio (or loaded with metadata).
* Videos have `aspectRatio` or capped height and do not use absolute positioning to fill content unexpectedly.
* All meaningful images have `accessibilityLabel` (decorative images can be `accessible={false}`).

---

## 1) Find candidates (where to look)

Run these ripgrep commands from project root:

* All Image/ImageBackground tags:

  * `rg "<(Image|ImageBackground)\\b" -n src app components screens pages`
* Remote images:

  * `rg "source=\\{\\s*\\{\\s*uri\\s*:" -n`
* Images with numeric width/height/absolute:

  * `rg "width:\\s*\\d+|height:\\s*\\d+|position:\\s*['\"]?absolute['\"]?" -n src`
* Videos/WebView:

  * `rg "<(Video|WebView)\\b|react-native-video" -n`
* Missing accessibilityLabel:

  * `rg "<(Image|ImageBackground)\\b(?![\\s\\S]*accessibilityLabel)" -n`

Record results: `{ file, start_line, end_line, snippet, why_suspicious }`.

---

## 2) Fix patterns & example code

### A — Image without `aspectRatio`

**Problem:** image only has `width` or no constraints → can overflow
**Fix:** add `aspectRatio` or wrap in responsive container.

Bad:

```tsx
<Image source={img} style={{ width: 300 }} />
```

Good:

```tsx
<View style={{ width: '100%', maxWidth: 600 }}>
  <Image source={img} style={{ width: '100%', aspectRatio: 16/9, resizeMode: 'cover' }} />
</View>
```

If you must guess a ratio add `// REVIEW: guessed aspectRatio`.

---

### B — Background images

**Problem:** absolute/fixed-height background causes gaps/overflow
**Fix:** use `ImageBackground` with `flex:1`, `width:'100%'`, `height:'100%'`, `resizeMode='cover'`.

Good:

```tsx
<ImageBackground source={bg} style={{ flex:1, width:'100%', height:'100%' }} resizeMode="cover">
  <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.3)' }} />
</ImageBackground>
```

---

### C — Logos & icons (must not crop)

Use `resizeMode="contain"` and constrain size.

Good:

```tsx
<Image source={logo} style={{ width: 120, height: 40, resizeMode: 'contain' }} accessibilityLabel="Company logo" />
```

---

### D — Remote images

**Problem:** unknown size; may be huge
**Fixes:**

* Preferred: fetch image metadata (width/height) and set `aspectRatio` before render.
* Simpler: wrap in container + `aspectRatio` fallback + `resizeMode`.

Example (quick fallback):

```tsx
<View style={{ width:'100%', maxWidth:600 }}>
  <Image source={{ uri }} style={{ width:'100%', aspectRatio: 4/3, resizeMode:'cover' }} />
</View>
```

Longer-term: add logic to fetch image headers or use an image CDN that returns sizes.

---

### E — Videos / WebViews

**Fix:** same as images — give `aspectRatio` or compute height (using `useWindowDimensions`) and avoid `position:absolute`.

Good:

```tsx
const { width } = useWindowDimensions();
const h = Math.min(540, Math.round(width * 9 / 16));
<Video source={src} style={{ width, height: h }} resizeMode="cover" />
```

---

### F — Absolute-positioned / huge fixed-height media

**Action:** remove `position:'absolute'` unless it's a decorative overlay. Replace fixed `height` with `aspectRatio` or clamped height via `useWindowDimensions()`.

Bad:

```tsx
<Image style={{ position:'absolute', height:1000 }} ... />
```

Fix with flex container or clamp height.

---

### G — Accessibility

* Add `accessibilityLabel` to content images.
* Decorative images: `accessible={false}` and comment.

Example:

```tsx
<Image source={p} accessibilityLabel="Blue running shoes, front view" />
```

---

## 3) Grep / codemod hints (report-only)

* Annotate images missing `aspectRatio`:

  * jscodeshift rule idea: find `<Image` with `style` not containing `aspectRatio` → insert `// REVIEW: add aspectRatio or wrap in constrained container`.
* Do **not** auto-insert guessed aspect ratios — prefer report + manual fixes.

Commands summary:

* `rg "<Image\\b" -n`
* `rg "aspectRatio" -n`
* `rg "resizeMode" -n`
* `rg "position:\\s*['\"]?absolute['\"]?" -n`


