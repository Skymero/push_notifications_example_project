---
description: 
auto_execution_mode: 1
---

For the mantioned component and/or container do the following: 

**What it is**: Wrap a container with a bright border.
**Why**: Lets you visually see where content is spilling or misaligned.
* **Why it matters**: Fastest way to catch which child is “escaping” layout.

Fast detector: add a debug frame

Drop this in any misbehaving screen to see bounds instantly:

```tsx
const DebugFrame = ({ children }) => (
  <View style={{ flex: 1, borderWidth: 2, borderColor: 'magenta' }}>
    {children}
  </View>
);
```

If content spills outside the magenta box, a child has fixed sizing or absolute positioning.