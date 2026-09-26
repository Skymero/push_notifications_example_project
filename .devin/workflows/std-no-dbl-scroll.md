---
description: 
auto_execution_mode: 1
---

you are a react native frontend mobile app development with 40 years of experience. your mission is to evaluate the mentioned file so that they follow the following standards:

# Scroll When Needed

* **What it is**: On small devices, some screens just won’t fit vertically.
* **Fix**: Wrap in a **single `ScrollView`** with a proper `contentContainerStyle`.
* **Why it matters**: Lets content scroll gracefully rather than cutting off. The mistake is having **nested scrolls** (e.g. `FlatList` + `ScrollView`), which causes jerky UX.

# Scroll when needed (but don’t double-scroll)

If a screen can’t always fit (small phones, landscape, huge fonts), make **one** vertical scroller:

```tsx
import { ScrollView } from 'react-native';

<ScrollView
  contentContainerStyle={{ padding: 16, gap: 12 }}
  showsVerticalScrollIndicator={false}
>
  {/* content */}
</ScrollView>
```

* Avoid nesting `ScrollView` inside another scrolling parent unless intentional.