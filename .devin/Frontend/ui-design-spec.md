# Design System Specification: The Analog Island

strict rule: {Do not change the styling for `TrendingGrid.jsx`, `inbox.jsx InboxMessageCard`}

## 1. Overview & Creative North Star
**Creative North Star: "The Neon Oasis"**

This design system eschews the sterile, rigid layouts of traditional mobile apps in favor of an editorial, "lofi-party" experience. We are creating a digital space that feels like an evening campfire on a secluded beach—warm, rhythmic, and intentionally textured. 

To break the "template" look, we employ **Organic Brutalism**. This means we use bold, high-contrast typography and vibrant pops of color, but we soften them through intentional asymmetry, overlapping elements (like an illustration breaking the bounds of a container), and a signature grain texture. The goal is to make the interface feel less like software and more like a tactile, analog artifact.

---

## 2. Color & Texture Strategy
Our palette balances the warmth of a sunset (`primary`) with the electric hum of a neon palm tree (`secondary`).

### The Palette
*   **Primary (#F97316 / #9d4300):** Our "Firelight" orange. Used for key actions and focal points.
*   **Secondary (#169cf9 / #0062a0):** Our "Neon Blue." Used for interactive elements and accents that need to pop against the warmth.
*   **Surface (#F7F9DD):** The "Sand" background. A warm, off-white that prevents the digital eye-strain of pure white.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. We define space through "Tonal Shifts."
*   If a card sits on `surface`, it should be `surface-container-low`.
*   If an input field sits inside that card, it should be `surface-container-highest`.
*   Visual boundaries are created by the meeting of two color masses, never by a stroke.

### The "Glass & Gradient" Rule
To inject "soul" into the UI, use linear gradients for primary CTAs (transitioning from `primary` to `primary-container`). For floating navigation bars or overlays, use **Glassmorphism**:
*   **Fill:** `surface` at 70% opacity.
*   **Backdrop Blur:** 12px to 20px.
*   **Effect:** This allows our grain-textured background illustrations to peek through, creating a sense of environmental depth.

### Signature Texture
Every major surface must have a subtle **Analog Grain**. Apply a noise SVG filter at 3–5% opacity over `surface` and `primary` containers. This mimics the feel of lofi print or vintage film.

---

## 3. Typography
We use a high-contrast pairing of **Montserrat** and **Open Sans** to balance playfulness with legibility.

*   **Display (Montserrat Bold):** Used for "Hero" moments. Use `display-lg` with tight letter-spacing (-2%) to create an editorial, poster-like feel.
*   **Headlines (Montserrat Bold):** Should feel authoritative. Use `headline-md` for section headers, often paired with an asymmetrical layout (e.g., left-aligned with a 24pt indent).
*   **Subheadings (Montserrat Medium):** Used for `title-sm` and `title-md`. These act as the "connective tissue" between the bold headers and the body.
*   **Body (Open Sans Regular):** Our workhorse. Use `body-md` for all long-form text. It provides a clean, neutral counter-balance to the expressive Montserrat.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "software-standard." We use **Tonal Stacking**.

*   **The Layering Principle:** 
    *   Base Level: `surface`
    *   Section Level: `surface-container-low`
    *   Interactive Card: `surface-container-lowest` (This creates a "lifted" paper effect).
*   **Ambient Shadows:** If a floating element (like a FAB) requires a shadow, it must be tinted. Use a 10% opacity version of `on-surface` with a 30px blur and 10px Y-offset.
*   **The "Ghost Border" Fallback:** In high-density data views where tonal shifts aren't enough, use a "Ghost Border": `outline-variant` at 15% opacity. Never use 100% opacity strokes.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background with `on-primary` text. Use `rounded-xl` (1.5rem) for a friendly, chunky feel. Apply a subtle 2px inner-glow (lighter orange) at the top to mimic a tactile button.
*   **Secondary:** `secondary-container` background. These should feel like "cool" accents.
*   **States:** On press, scale the button down to 0.96 and darken the background by 10%. Transitions must be 200ms "fluid-ease."

### Chips
*   **Style:** Pill-shaped (`rounded-full`). 
*   **Logic:** Use `surface-container-high` for unselected and `secondary` for selected. No borders.

### Cards & Lists
*   **Anti-Pattern:** No divider lines between list items.
*   **Pattern:** Use 16px of vertical whitespace (`spacing-4`) and `surface-container-low` backgrounds to separate content chunks.
*   **The "Island" Card:** For featured content, use an asymmetrical corner radius (e.g., top-left: `xl`, others: `md`) to mimic the "lofi-party" quirkiness.

### Input Fields
*   **Visuals:** A "sunken" look. Use `surface-container-highest` with a `label-sm` Montserrat tag floating above it. 
*   **Error State:** Change the background to `error-container`, not just the text color.

### Custom Component: The "Island Toggle"
A segmented control that looks like a beach towel or a horizon line. Use `surface-container-low` as the track and `primary` as the sliding indicator.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** allow illustrations to overlap text or container boundaries. It creates a "scrapbook" feel.
*   **Do** use asymmetrical margins (e.g., 24px on the left, 16px on the right) for headline-heavy screens.
*   **Do** use `primary-container` (#F97316) for large "glow" effects behind campfire illustrations.

### Don’t:
*   **Don't** use pure black (#000000). Always use `on-surface` (#1a1d12) to maintain the warm, analog vibe.
*   **Don't** use sharp 90-degree corners. Everything should have at least a `sm` (0.25rem) radius to feel "soft" and inviting.
*   **Don't** use standard "Slide Right" transitions. Use "Fade-and-Scale" transitions to mimic the appearing/disappearing nature of a dreamlike island.

### Accessibility Note:
While we lean into a lofi aesthetic, never sacrifice contrast. Ensure all `body-md` text on `surface` backgrounds maintains a 4.5:1 ratio. Use the `secondary` blue sparingly for text, as it performs best as a graphical accent rather than a primary reading color.