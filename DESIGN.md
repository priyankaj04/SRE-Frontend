# Design System Specification: The Kinetic Observability Framework

## 1. Overview & Creative North Star
### Creative North Star: "The Command Horizon"
Site Reliability Engineering (SRE) is the art of managing chaos through precision. This design system moves away from the cluttered, "dashboard-heavy" aesthetic of the early 2010s toward a **Command Horizon**—a high-fidelity, editorial-inspired environment where data breathes. 

The system rejects the "boxed-in" feeling of traditional enterprise software. Instead, it utilizes **Intentional Asymmetry** and **Tonal Depth** to guide the eye. By leveraging a high-contrast typography scale (Space Grotesk for impact, Inter for utility) and a "No-Line" philosophy, we create a UI that feels less like a spreadsheet and more like a high-end flight deck. It is professional, high-tech, and unapologetically efficient.

---

## 2. Colors & Surface Philosophy
The palette is built on a foundation of deep, nocturnal tones, punctuated by high-energy "Electric" accents.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be established exclusively through background color shifts. 
*   **Example:** A code snippet container (`surface-container-low`) should sit directly on the main page background (`surface`) without a stroke. Use the `0.2rem` to `0.4rem` spacing tokens to let the color change define the edge.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to create "nested" depth:
*   **Background (`#10131a`):** The canvas.
*   **Surface Container Lowest (`#0b0e14`):** Use for sunken utility areas (e.g., terminal outputs, log streams).
*   **Surface Container High (`#272a31`):** Use for elevated interactive cards or modal overlays.

### The "Glass & Gradient" Rule
To escape the "flat" look, apply a 15% opacity to `primary-container` (`#58a6ff`) with a `backdrop-blur(12px)` for floating navigation or hovering inspect-panels. Use a subtle linear gradient (Top-Left to Bottom-Right) on primary CTAs: transitioning from `primary` (`#a2c9ff`) to `primary-container` (`#58a6ff`) to give buttons a machined, metallic sheen.

---

## 3. Typography
We use a dual-typeface system to balance technical authority with human readability.

*   **Display & Headlines (Space Grotesk):** This font carries the "Brand Soul." Its geometric quirks suggest a high-tech, slightly brutalist edge. Use `display-lg` (3.5rem) for system status overviews and `headline-sm` (1.5rem) for section titles.
*   **Body & Utility (Inter):** Inter is our workhorse. It is optimized for small-scale legibility in log files and metric labels. 
*   **The Signature Scale:** Maintain high contrast between headlines and body. A `headline-lg` title should often be paired with a `body-sm` description to create a sophisticated, editorial hierarchy that avoids the "middle-ground" blandness of standard UI.

---

## 4. Elevation & Depth
Depth in this system is an atmospheric effect, not a structural one.

### The Layering Principle
Stack tiers to define importance. A `surface-container-highest` (`#32353c`) element placed on a `surface-dim` background creates a natural focal point. Shadows should be secondary to color-shifting.

### Ambient Shadows
When an element must "float" (e.g., a critical alert popover), use a "Shadow-Glow" technique:
*   **Blur:** 24px - 40px.
*   **Opacity:** 6% - 10%.
*   **Color:** Use a tinted version of the surface color (or `primary` for active states), never pure black. This mimics the ambient light of a dark-mode terminal.

### The Ghost Border
If an interface requires an explicit boundary for accessibility (e.g., an input field), use the **Ghost Border**:
*   **Token:** `outline-variant` (`#414752`).
*   **Opacity:** 20% max. 
*   **Style:** 1px solid, but only to provide a "suggestion" of a container.

---

## 5. Components

### Buttons (The Kinetic Trigger)
*   **Primary:** Gradient fill (`primary` to `primary-container`), white text (`on-primary`), `md` (0.375rem) corner radius.
*   **Secondary:** Ghost Border style. No fill, `outline-variant` at 40% opacity, `primary` color text.
*   **States:** On hover, increase the `backdrop-filter: brightness(1.2)`.

### Input Fields
*   **Base:** `surface-container-low` fill. No top/left/right borders; use a 2px bottom-border of `outline-variant` that transitions to `primary` on focus.
*   **Typography:** Use `body-md` for input text and `label-sm` for floating labels.

### Status Indicators (The Pulse)
*   **Healthy:** `secondary` (`#67df70`). Pair with a subtle outer glow (4px blur) to simulate a physical LED.
*   **Alert:** `tertiary-container` (`#ff7b70`). 
*   **Critical:** `error` (`#ffb4ab`).

### Cards & Data Lists
*   **Constraint:** Zero dividers. Use vertical spacing (`spacing-4` or `spacing-6`) and `surface-container` shifts to separate list items. 
*   **Layout:** Use asymmetrical padding (e.g., more padding on the left than the right) to create a modern, rhythmic flow for metric data.

### SRE-Specific Components: "The Sparkline"
*   **Metric Micro-Charts:** Use `primary` for lines, but fill the area below the line with a 5% opacity gradient of the same color. This creates a "Glassmorphic Graph" that feels integrated into the surface.

---

## 6. Do's and Don'ts

### Do
*   **Do** embrace negative space. If a layout feels "empty," increase the typography size of the headline rather than adding a box.
*   **Do** use `space-2` (0.4rem) for tight technical groupings and `space-10` (2.25rem) for section breathing room.
*   **Do** use monochromatic icons. Only use color (`secondary`, `tertiary`, `error`) for actual system status.

### Don't
*   **Don't** use 100% white text on the `#0B0E14` background. Use `on-surface-variant` (`#c0c7d4`) for better long-term readability and reduced eye strain.
*   **Don't** use "Drop Shadows" on static cards. Let the tonal shift of the `surface` tokens do the work.
*   **Don't** use rounded corners larger than `xl` (0.75rem). The brand is "Professional" and "High-Tech"—excessive roundness makes the system feel consumer-grade and "soft."