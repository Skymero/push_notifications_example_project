---
description: Scroll Behavior (Single Vertical Scroller & No Nested Scrolling)
auto_execution_mode: 3
---

# Junior Dev Checklist — Scroll Behavior (Single Vertical Scroller & No Nested Scrolling)

Clear, step-by-step checklist your junior devs can follow to find, fix, test, and ship scroll-related layout issues: wrap overflowing screens in one vertical `ScrollView`, avoid nested vertical scroll parents (`ScrollView` + `FlatList`), add `contentContainerStyle`, and handle horizontal carousels safely.

---

## 1) Quick rules / expected outcome

* **One vertical scroller per screen.** If a screen may overflow (small phones, landscape, large fonts) it should have **a single `ScrollView`** or a single primary scroller (`FlatList`/`SectionList`) — not both.
* **No nested vertical scrolling** (e.g., `ScrollView` wrapping `FlatList`) unless explicitly documented and intentionally disabled on the inner list.
* **Use `contentContainerStyle`** on `ScrollView` for padding/gap so children aren’t clipped.
* **Horizontal lists/carousels are allowed** inside vertical scrollers — but test for gesture conflicts (`nestedScrollEnabled`, `pagingEnabled`).

---

## 2) Locate problematic files

Use these quick searches to list candidates:

* Any ScrollView:
  `rg "<ScrollView\\b" -n src app components screens pages`
* FlatList / SectionList:
  `rg "<(FlatList|SectionList|VirtualizedList)\\b" -n src`
* ScrollView containing FlatList (flag obvious nested cases):
  `rg "(<ScrollView[\\s\\S]*<FlatList)|(<FlatList[\\s\\S]*<ScrollView)" -n src`
* ScrollViews missing contentContainerStyle:
  `rg "<ScrollView\\b(?![\\s\\S]*contentContainerStyle)" -n src`

Record results as: `{ file_path, line_range, snippet, why_suspicious }`.

---

## 3) Fix patterns & exact steps

### A — Screen should use a single `ScrollView`

When a screen has many static children and may overflow (forms, settings, profile):

1. Wrap the entire screen content in one `ScrollView` (top-level inside the screen component).
2. Use `contentContainerStyle` for padding/gap:

```tsx
<ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
  {/* all screen content here (header, cards, buttons) */}
</ScrollView>
```

3. Remove inner `ScrollView`s (convert them to simple `View`s) — unless they must scroll independently (flag those cases).

### B — If screen contains lists, make list the primary scroller

If the screen contains a `FlatList`/`SectionList`:

1. **Prefer:** make `FlatList` the main scroller and move header/footer content to `ListHeaderComponent` / `ListFooterComponent`.

```tsx
<FlatList
  data={items}
  renderItem={...}
  ListHeaderComponent={() => <View>{/* header content */}</View>}
  ListFooterComponent={() => <View>{/* footer content */}</View>}
/>
```

2. **If non-list content is complex**, put it in header/footer rather than wrapping `FlatList` with `ScrollView`.
3. **If you cannot avoid nested scrollers:** set `scrollEnabled={false}` on inner scroll views and let the outer handle vertical scrolling — add a `// REVIEW` comment and document tradeoffs.

### C — Remove inner ScrollViews that create nested vertical scrolling

* Convert inner `ScrollView`s to `View`s or non-scrolling containers.
* For small independent panels that must scroll horizontally, keep horizontal scrollers only.

### D — Ensure `contentContainerStyle` exists

* Add `contentContainerStyle={{ padding: <base>, gap: <base> }}` to every `ScrollView` (standardize base padding e.g., 16).
* Do not put top-level padding on children that expect to be full width; centralize it on `contentContainerStyle`.

### E — Horizontal carousels inside vertical scroller

* Keep horizontal lists/carousels inside the vertical scroller but:

  * On Android consider `nestedScrollEnabled` on inner lists.
  * For touch/gesture reliability prefer native gesture-based carousels (or `react-native-gesture-handler`) for complex UX.
* Test vertical/horizontal swipe interactions.

---

## 4) Example before → after fixes

**Bad (nested vertical scrollers)**

```tsx
// Bad: ScrollView wraps FlatList — causes nested vertical scrolling
<ScrollView>
  <Header />
  <FlatList data={...} renderItem={...} />
  <Footer />
</ScrollView>
```

**Good (FlatList as primary scroller)**

```tsx
// Good: FlatList is main scroller; header moved into ListHeaderComponent
<FlatList
  data={...}
  renderItem={...}
  ListHeaderComponent={<Header />}
  ListFooterComponent={<Footer />}
/>
```

**Good (single ScrollView for static content)**

```tsx
<ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
  <Header />
  <Card />
  <Form />
</ScrollView>
```

---

## 5) Grep / codemod hints (report-only)

* List all ScrollViews: `rg "<ScrollView\\b" -n`
* Find nested occurrences: `rg "(<ScrollView[\\s\\S]*<ScrollView)|(<ScrollView[\\s\\S]*<FlatList)" -n`
* Find ScrollViews missing contentContainerStyle: `rg "<ScrollView\\b(?![\\s\\S]*contentContainerStyle)" -n`
* jscodeshift idea (report-only): annotate files where `<ScrollView` and `<FlatList` appear together and create TODO comments for manual review.

**Do not auto-apply destructive codemods** — always create report entries for manual review.


