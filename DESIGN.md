# 🪐 ASA Journey - Design System & UI Mechanics Guide

This guide documents the premium visual identity, animations, and custom UI components of ASA Journey. It serves as a comprehensive reference so future AI agents and developers can replicate the exact observatory-themed aesthetics and physics-inspired mechanics in new projects.

---

## 1. Visual Aesthetics & Color Palette

ASA Journey is built with a **quietly premium, calm, observatory-like aesthetic**. It avoids generic styles by employing soft light-mode layouts, subtle thin borders, custom serif typography for long-form reading, and vibrant high-contrast cosmic colors for highlights and progress tracking.

### Core Color Palette
| Token | HEX | Tailwind/Usage | Purpose |
| :--- | :--- | :--- | :--- |
| **Dark Slate** | `#2F3331` | `text-[#2F3331]`, `bg-[#2F3331]` | Primary headings, buttons, solid elements, main text |
| **Accent Green** | `#00DC7D` | `text-[#00DC7D]`, `bg-[#00DC7D]` | Brand highlight, active navigation, main action CTA |
| **Neutral Muted** | `#6F7476` | `text-[#6F7476]` | Subheadings, descriptions, meta-labels, secondary text |
| **Neutral Muted Light**| `#A3A7A8` | `text-[#A3A7A8]` | Placeholders, inactive items, timestamps |
| **Card White** | `#FAFAFA` | `bg-[#FAFAFA]` | Soft card background panels |
| **Border Soft** | `#EEF0EF` | `border-[#EEF0EF]` | Thin boundary borders, card dividers |
| **Border Darker** | `#CCD0CF` | `border-[#CCD0CF]` | Input fields outline, default buttons outline |

### Typography
- **Core Sans-Serif**: `font-sans` (Outfit/Inter style) for buttons, labels, and structured components.
- **Core Serif (Cosmic Quote style)**: `font-serif` (Georgia/Outfit Serif style) for daily summaries, reflection paragraphs, and dream content to encourage a relaxed, reflective journaling experience.

---

## 2. Fixed Navigation & Bottom Bar

The main navigation relies on a floating, centered, glassmorphic layout.

### Bottom Bar Layout
- **Style**: Centered bar, fixed at the bottom with a blur backdrop (`backdrop-blur-md bg-white/85 border border-[#EEF0EF] shadow-lg`).
- **Icons**: Simple monochrome FontAwesome icons, transforming to Accent Green (`#00DC7D`) and shifting up slightly when active.
- **Center Floating Button (FAB)**:
  - Triggered with a sparkles icon ✨ (`faWandMagicSparkles` or similar custom SVG) or GPS icon when location tracking is active.
  - Active buttons utilize a scale animation on click/hover (`hover:scale-105 active:scale-95 transition-all`).

---

## 3. Top Navigation & Calendar Header

The header contains a horizontal timeline view showing the current week's dates.

### Heat Dot Indicators
Below each date inside the timeline, small animated dot markers (called `orbit-dot` with delayed float animations) indicate logged entries:
- **Green Dot** (`#00DC7D`): Dream logs
- **Blue/Purple Dot** (`#5D8AFF`): Wisdom summaries
- **Dark Green Dot** (`#00875A`): Notes
- **Orange Dot** (`#FFA952`): Ideas

---

## 4. Cosmic Orbit Loading Circle

Instead of standard circular spinners, the app uses a custom concentric "Cosmic Orbit" loader that evokes planetary rotation.

```tsx
<div className="relative mb-4 flex h-14 w-14 items-center justify-center">
  {/* Static outer ring */}
  <span className="absolute h-full w-full rounded-full border-2 border-[#00DC7D]/10" />
  
  {/* Rotating orbit segment */}
  <span className="absolute h-full w-full animate-spin rounded-full border-2 border-t-[#00DC7D] border-r-transparent border-b-transparent border-l-transparent" />
  
  {/* Pulsing center core */}
  <div className="h-2.5 w-2.5 animate-ping rounded-full bg-[#00DC7D] opacity-75" />
</div>
```

---

## 5. Shimmering Glowing Progress Bars (Goals & Confidence)

The goals page and weekly reflections use high-contrast shimmering progress bars with soft colored neon dropshadows.

### Shimmer Keyframe CSS
Defined in `src/app/globals.css`:
```css
@keyframes progress-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes pulse-opacity {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
```

### Predefined Shimmer Classes
1. **`.energetic-progress` (Core Goals / Cyan-Green)**:
   ```css
   background: linear-gradient(90deg, #00DC7D 0%, #3bf7ab 35%, #00FFCC 50%, #3bf7ab 65%, #00B866 100%);
   background-size: 200% 100%;
   animation: progress-shimmer 3s infinite linear;
   box-shadow: 0 0 12px rgba(0, 220, 125, 0.55), 0 0 4px rgba(0, 255, 204, 0.3);
   ```
2. **`.hyperfocus-progress` (Hyperfocus Goal / Purple)**:
   ```css
   background: linear-gradient(90deg, #8B00D4 0%, #b152ee 35%, #C494FF 50%, #b152ee 65%, #7000B3 100%);
   background-size: 200% 100%;
   animation: progress-shimmer 3s infinite linear;
   box-shadow: 0 0 12px rgba(139, 0, 212, 0.55), 0 0 4px rgba(196, 148, 255, 0.3);
   ```
3. **`.top3-progress` (Top 3 Goals / Forest Green)**:
   ```css
   background: linear-gradient(90deg, #00875A 0%, #05af77 35%, #00C58A 50%, #05af77 65%, #006644 100%);
   background-size: 200% 100%;
   animation: progress-shimmer 3s infinite linear;
   box-shadow: 0 0 12px rgba(0, 135, 90, 0.55), 0 0 4px rgba(0, 197, 138, 0.3);
   ```
4. **`.pareto-progress` (Pareto Goal / Orange-Yellow)**:
   ```css
   background: linear-gradient(90deg, #FF9933 0%, #ffa952 35%, #FFCC66 50%, #ffa952 65%, #CC7A00 100%);
   background-size: 200% 100%;
   animation: progress-shimmer 3s infinite linear;
   box-shadow: 0 0 12px rgba(255, 153, 51, 0.55), 0 0 4px rgba(255, 204, 102, 0.3);
   ```
5. **`.fiery-progress` (Confidence Bar / Glowing Neon Orange)**:
   - Used in weekly confidence indicators.
   - Fast 2-second shimmer rate with deep orange glow:
   ```css
   background: linear-gradient(90deg, #FF4500 0%, #FF8C00 35%, #FFD700 50%, #FF8C00 65%, #FF4500 100%);
   background-size: 200% 100%;
   animation: progress-shimmer 2s infinite linear;
   box-shadow: 0 0 14px rgba(255, 69, 0, 0.65), 0 0 6px rgba(255, 215, 0, 0.45);
   ```
   - Includes a trailing animated tracking pin at the progress edge:
     ```tsx
     <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200/40 p-[0.5px]">
       <div
         className="h-full rounded-full fiery-progress"
         style={{ width: `${percent}%` }}
       />
       {percent > 0 && percent < 100 && (
         <div 
           className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)] animate-ping"
           style={{ left: `${percent}%`, backgroundColor: '#FF4500' }}
         />
       )}
     </div>
     ```

---

## 6. Premium Interactive Line Charts (Sleep & Energy)

Charts are drawn using pure SVG elements to maintain pixel-perfect sizing, custom gradients, and custom interaction overlays.

### Bezier Spline Connection
Instead of drawing straight lines (`L x y`), endpoints are connected using a cubic Bezier curve algorithm to represent smooth physiological rhythms:
```typescript
export function getBezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    // Control points at 1/3 and 2/3 of horizontal span
    const cpX1 = p0.x + (p1.x - p0.x) / 3;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (2 * (p1.x - p0.x)) / 3;
    const cpY2 = p1.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return path;
}
```

### Area Gradients
Gradients fill the area under the Bezier path down to the bottom limit of the chart:
- **Sleep Area**: `#3B82F6` (blue) fading out to `rgba(59, 130, 246, 0)` at bottom.
- **Energy Area**: `#00DC7D` (green) fading out to `rgba(0, 220, 125, 0)` at bottom.
- **Word Count Area**: `#FFB95C` (yellow) fading out to `rgba(255, 185, 92, 0)` at bottom.

### Interactive Hover Overlay
- **Tracking Column Bar**: A vertical, semi-transparent rect highlights the current hover section (`width="16" fill="rgba(47, 51, 49, 0.04)" rx="4"`).
- **Enlarged Hover Dots**: Circle points expand from radius `4.5` to `6.5` with a thick white border (`stroke-width="2.5"`).
- **Pop-up Value Pills**: Text numbers representing scores (e.g. `85` or `8`) are completely hidden by default and appear above/below active points inside color-coded rounded capsules only when the user's cursor hovers over that column index.
