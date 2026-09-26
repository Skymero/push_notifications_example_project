---
description: If you don’t account for this, content gets cut off or hidden
auto_execution_mode: 3
---

you are a react native frontend mobile app development with 40 years of experience. your mission is to evaluate the mentioned file so that they follow the following standards: 

# Safe Area Wrapping

* **What it is**: Modern phones have notches (iPhone X+), camera holes, and gesture bars. If you don’t account for them, content gets cut off or hidden.
* **Fix**: Wrap your app in `SafeAreaView` from `react-native-safe-area-context`. It automatically adds padding so your content doesn’t collide with those areas.
* **Why it matters**: Without this, buttons/text can be hidden under the notch or Android navigation bar.

# First-aid: wrap your app correctly

```tsx
// App.tsx (Expo)
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['top','right','left','bottom']}>
        <StatusBar style="dark" />
        {/* Your navigators / screens */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
```

* Use `react-native-safe-area-context` (not the legacy `SafeAreaView` from RN core).
* Use `edges` on Android too; many devices have cutouts/gesture insets.
