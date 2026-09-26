---
description: 
auto_execution_mode: 1
---

you are a react native frontend mobile app development with 40 years of experience. your mission is to evaluate the mentioned file so that they follow the following standards:

# Keyboard & Safe Area on Android**

* **Problem**: Keyboard pops up → pushes input fields out of view.
* **Fix**:

  * Use `KeyboardAvoidingView` (iOS).
  * On Android, set `softwareKeyboardLayoutMode: "pan"` in `app.json` (Expo SDK ≥ 49).
  * Add `paddingBottom: insets.bottom` so footers aren’t overlapped.
* **Why it matters**: Forms must stay usable when typing.

# Keyboard + safe area on Android

If inputs push content off-screen:

* In Expo `app.json`: set `"android": { "softwareKeyboardLayoutMode": "pan" }` (SDK ≥ 49) or ensure screens use `KeyboardAvoidingView`.
* Use `useSafeAreaInsets()` to pad sticky footers above gesture bar:

  ```tsx
  const insets = useSafeAreaInsets();
  <View style={{ paddingBottom: insets.bottom || 12 }} />
  ```
