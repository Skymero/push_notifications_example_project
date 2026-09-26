---
description: Responsive Layout standard fixes
auto_execution_mode: 3
---

you are a react native frontend mobile app development with 40 years of experience. your mission is to evaluate the mentioned file so that they follow the following standards: 


# Responsive Layout with Flexbox

* **What it is**: Letting elements adapt to screen size using flex, percentages, or `aspectRatio` instead of fixed pixels.
* **Example**: An image with `width:'100%'` and `aspectRatio:16/9` will always fit perfectly no matter the phone.
* **Why it matters**: Ensures design “breathes” and adapts from tiny Androids to giant iPads.


# Example
## Make layout responsive by default

Use Flexbox + percentages + `aspectRatio`:

```tsx
// ResponsiveContainer.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, useWindowDimensions } from 'react-native';

export default function ResponsiveContainer() {
  const { width, height, fontScale } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[styles.title, { fontSize: 20 / fontScale }]} // tame text scaling
        >
          Screen {Math.round(width)}×{Math.round(height)}
        </Text>
      </View>

      <View style={styles.card}>
        <Image
          source={{ uri: 'https://picsum.photos/800/600' }}
          style={styles.hero}
          resizeMode="cover"
        />
        <Text style={styles.body}>
          Flexible card that never exceeds screen width and keeps image ratio.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12 },
  header: { alignItems: 'center' },
  title: { fontWeight: '700' },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'stretch',     // <- expands to parent width
    maxWidth: '100%',         // <- never exceed screen width
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,      // <- guarantees height from width
    borderRadius: 8,
  },
  body: { lineHeight: 20 },
});
```
