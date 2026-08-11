---
name: remotion-best-practices
description: Official Remotion AI Best Practices & Motion Engineering Skill for Virali AI. Covers composition layering, Safe Zones, dynamic Z-axis camera motion, spring physics presets, anticipation frame math, mathematical seed jitter, medium rotation, and sound cues.
---

# Remotion AI Best Practices & Motion Engineering Bible

This skill defines the technical rules, composition architecture, frame math, and prompt engineering protocols for rendering ultra-high-retention vertical videos (9:16) in Remotion.

---

## 1. Composition Layering & Safe Zones

To prevent UI elements from clashing or obscuring the speaker's face, strictly enforce the following composition hierarchy:

### Layer Hierarchy
- **Layer 0 (Background & Speaker Video):** Base canvas (1080x1920 or 720x1280). Speaker video starts full-bleed (`scale: 1.0`).
- **Layer 1 (Dynamic Remotion Motion Cards):** Infographic overlays (`chart`, `kinetic_quote`, `tweet_card`, `list`, `stat_callout`, `3d_icon`).
- **Layer 2 (Brand Captions & Subtitles):** Positioned at bottom (`y = 0.85 * videoHeight` or `y = 1632px` on 1080p).

### Safe Zones Rules
- **Top Banner (Quotes / Tweet Cards):** Anchor at `y = 0.05 * height` (approx. 96px from top) — safely above speaker face.
- **Bottom Sheet (Charts / Lists / Stats):** Anchor at `y = 0.68 * height` (approx. 1300px from top) — safely below speaker chin.
- **Side Panel Transformation:** When a `chart` or `list` overlay is active, the Speaker Video MUST automatically trigger a `scale_to_circle` camera cut (`scale: 0.45`, `translateX: -25%`), pushing the speaker video into a clean circular frame on the left, while the card expands on the right (`x = 48%`).

---

## 2. Dynamic Z-Axis Live Camera Motion Rules

Static camera footage reduces viewer retention. Remotion must keep the camera alive with continuous micro-motion:

| Camera Action | Scale / Transformation | Trigger / Timing |
| :--- | :--- | :--- |
| **Continuous Breathing Micro-Zoom** | `1.0` ➔ `1.03` (linear/cubic over section) | Active during default speech to maintain visual tension. |
| **Punch Zoom** | `1.0` ➔ `1.12` (instant spring: `mass: 0.6, damping: 9`) | Triggered on hooks, numbers, and punch words. |
| **Scale to Circle (Left Shift)** | `scale: 0.45`, `translateX: -25%`, `borderRadius: 50%` | Triggered automatically whenever a side card is displayed. |
| **Move Left** | `scale: 0.8`, `translateX: -30%`, `borderRadius: 24px` | Triggered for full-height side list overlays. |
| **PiP Right** | `scale: 0.4`, `translateX: +30%` | Picture-in-picture corner placement. |

---

## 3. Frame Math & Anticipation Offset (-150ms / -4 Frames)

Human perception anticipates spoken words. Motion elements appearing *after* a word is spoken feel laggy.

- **Anticipation Offset:** `startFrame = Math.max(0, Math.round(startSec * fps - 4))` (-150ms at 30 FPS).
- **Duration Frames:** `durationFrames = Math.round(durationSec * fps)`.
- **Sound Sync:** Sound cues (`whoosh`, `pop`, `click`) MUST be queued at `startFrame + 1`.

---

## 4. Mathematical Seed Jitter (Anti-Template Randomness)

To prevent viewers from noticing repeating templates, apply pseudo-random mathematical jitter based on `visualSeed`:

```typescript
// Seed Jitter Calculation (Angle between -4deg and +4deg)
const seedJitter = (elem.visualSeed || 42) % 9 - 4;
const jitterRad = (seedJitter * activeStyle.jitterRangeDeg * Math.PI) / 180;
```

---

## 5. Style Presets & Spring Physics Configuration

Use preset spring configurations tailored to the content niche:

```typescript
export const STYLE_PRESETS = {
  hormozi_bold: {
    colors: { accent: '#FACC15', secondary: '#22D3EE', background: '#09090B' },
    springConfig: { mass: 0.6, damping: 9, stiffness: 180 }, // Aggressive, snappy
    jitterRangeDeg: 4
  },
  minimal_expert: {
    colors: { accent: '#38BDF8', secondary: '#818CF8', background: '#0F172A' },
    springConfig: { mass: 0.8, damping: 14, stiffness: 140 }, // Balanced, professional
    jitterRangeDeg: 1.5
  },
  editorial_luxury: {
    colors: { accent: '#D4AF37', secondary: '#E2E8F0', background: '#0A110D' },
    springConfig: { mass: 1.0, damping: 16, stiffness: 100 }, // Smooth, elegant
    jitterRangeDeg: 1.0
  }
};
```

---

## 6. Dynamic Medium Rotation

To rotate asset styles across renders, combine:
`[Style Preset] + [Semantic Keyword] + [Art Medium]`

Supported Art Mediums:
1. `3D Glassmorphism` (translucent frosted glass, refraction)
2. `Claymation Stop-Motion` (tactile plasticine, studio lighting)
3. `Isometric 3D Line Art` (vector line art, glowing borders)
4. `Matte Frosted Plastic` (soft-touch satin surface)
5. `Holographic Neon Glass` (cybernetic glow, metallic accents)
