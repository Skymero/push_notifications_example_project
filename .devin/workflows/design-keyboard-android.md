---
description: eyboard & Safe Area fixes (React Native)
auto_execution_mode: 3
---

# Junior Dev Checklist — Keyboard & Safe Area fixes (React Native)

Fast, actionable checklist to find, and fix keyboard + safe-area problems so inputs stay visible while typing and footers aren’t overlapped.

---

## 1)  Quick goals / expected outcome

* Forms never get covered by the keyboard on iOS or Android.
* Sticky footers / action bars use safe-area insets (gesture bar).
* Only one keyboard-handling strategy per screen (no conflicting wrappers).
* Expo projects (SDK ≥ 49) have `android.softwareKeyboardLayoutMode: "pan"` suggested (manual review required).

---

## 2) Find likely problem spots

Search project to build a candidate list:

* Scrollables & forms:
  `rg "(<ScrollView|<FlatList|<SectionList|TextInput)\\b" -n src`
* Keyboard wrappers:
  `rg "KeyboardAvoidingView|KeyboardAwareScrollView|keyboardShouldPersistTaps" -n`
* Safe area usage:
  `rg "useSafeAreaInsets|SafeAreaView" -n`
* Expo app.json:
  `rg "softwareKeyboardLayoutMode|android" -n app.json app.config.js`
* Modal / bottom-sheet libs:
  `rg "Modal\\b|BottomSheet\\b|react-native-modal|react-native-bottom-sheet" -n`

Record results as: `{file, start_line, end_line, snippet, why_suspicious}`.

---

## 3) Fix patterns & exact steps

### A — Wrap forms in keyboard-aware container (iOS)

* **When:** screen has inputs that might be covered by keyboard.
* **Do:** Wrap screen with `KeyboardAvoidingView` and keep a single outer scroller (if needed).

```tsx
// pattern: KeyboardAvoidingView + ScrollView
import { Platform, KeyboardAvoidingView, ScrollView, View } from 'react-native';

<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
    {/* form content */}
  </ScrollView>
</KeyboardAvoidingView>
```

* **Notes:** On Android `behavior` is usually `undefined` — use `KeyboardAvoidingView` only for iOS and use `softwareKeyboardLayoutMode` on Android if using Expo (see B).

### B — Android: recommend `softwareKeyboardLayoutMode: "pan"` (Expo SDK ≥49) or native `windowSoftInputMode`

* **Action:** If project uses Expo SDK ≥49, add suggestion to `app.json` (manual PR only):

```json
"android": {
  "softwareKeyboardLayoutMode": "pan"
}
```

* **If bare RN:** suggest adding `android:windowSoftInputMode="adjustPan"` (or consult Android engineer) to `AndroidManifest.xml`.
* **Do NOT auto-apply** — provide suggested patch and request review.

### C — Sticky footers / bottom action bars: respect safe area

* Use `useSafeAreaInsets()` or `SafeAreaView`:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const insets = useSafeAreaInsets();

<View style={{ paddingBottom: insets.bottom || 12 }}>
  <Button title="Submit" />
</View>
```

* **Check:** footers use `insets.bottom` (or `SafeAreaView`) instead of a tiny fixed padding.

### D — Scroll props for better keyboard behavior

* Ensure scrollables wrapping inputs include:

  * `keyboardShouldPersistTaps="handled"`
  * sensible `keyboardDismissMode` (e.g., `'on-drag'`)
  * `contentContainerStyle={{ flexGrow: 1 }}` for vertical centering

```tsx
<ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
  {/* inputs */}
</ScrollView>
```

### E — Input focus handling (scroll into view)

* For inputs near the bottom of nested views, ensure `onFocus` scrolls parent to reveal:

  * use `ref` + `scrollTo()` or a library (`react-native-keyboard-aware-scroll-view`) for complicated layouts.
* If using nested lists, prefer single scroller; otherwise add `onFocus` -> `scrollToIndex/scrollTo`.

### F — Modals / BottomSheets

* Wrap modal content in `KeyboardAvoidingView` or use library props (e.g., `avoidKeyboard`) so inner inputs are visible.
* Test modals on both OSes and with large font sizes.

---

## 4) Grep / codemod hints (report-only)

* List forms without KeyboardAvoidingView: `rg "<ScrollView[^>]*>.*<TextInput" -n src`
* Find missing insets: `rg "useSafeAreaInsets|paddingBottom:\\s*insets" -n src`
* Annotate suspicious files with `// REVIEW` for manual checks rather than auto-fix.
* **Do not auto-edit app.json/AndroidManifest**; produce suggested patch text instead.

## 5) Update changelog