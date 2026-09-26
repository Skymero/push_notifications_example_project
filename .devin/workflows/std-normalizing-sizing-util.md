---
description: Small helper to scale font/margins relative to screen width.
auto_execution_mode: 3
---

you are a react native frontend mobile app development with 40 years of experience. your mission is to evaluate the mentioned file so that they follow the following standards:

# Normalized Sizing Utility

* **What it is**: Small helper to scale font/margins relative to screen width.
* **Example**: `ms(16)` → looks like 16px on iPhone SE, \~20px on Pixel 7 Pro.
* **Why it matters**: Keeps design balanced across small and large devices.


# Normalized sizing util (optional but handy)

```ts
// ui/scale.ts
import { PixelRatio, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
const guidelineBaseWidth = 375;

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const ms = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;
```

Use `ms(16)` for fonts/margins to adapt gently across devices.