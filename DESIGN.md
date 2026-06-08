# GitTree — Design Guidelines

Reference this file when building or modifying any UI in this project.

---

## Design System

### Style
**Dark fantasy + code aesthetic.** Obsidian blue-black surfaces with a warm
blood-red vignette, blood-red accents, and cool jewel-tone highlights (antique
gold is reserved for the highlighted ancestry path in the graph). Technical and
precise, but atmospheric rather than flat.

### Color Palette

Canvas (graph) colors live in `src/renderer/theme.ts`; UI chrome tokens are
defined in `tailwind.config.js`.

| Token | Value | Usage |
|---|---|---|
| `surface-overlay` | `#0b111a` | App / canvas background (obsidian) |
| `surface` | `#16202c` | Cards, panels, surfaces |
| `surface-elevated` | `#22303f` | Hover states, elevated surfaces |
| `text-white` | `#F8FAFC` | Primary headings, labels |
| `text-slate-400` | `#94A3B8` | Secondary / muted text (minimum for body) |
| `primary` (`#d24b4b`) | Blood red | Accent, CTAs |
| `primary-hover` (`#e06a6a`) | Bright red | Primary hover state |
| `accent-green` (`#4fb6c4`) | Teal | Success, "run/go" actions |
| Canvas `GOLD` (`#e0bd6b`) | Antique gold | Graph HEAD + highlighted path (`theme.ts`) |
| Border | `border-[#2b3744]` | Default card/panel borders |
| Border subtle | `border-white/5` | Header, section dividers |

> **Contrast rule**: All body text must meet 4.5:1 minimum against background. Use `text-slate-400` as the minimum for readable text — never `text-slate-500` for body copy.

### Typography

| Role | Font | Class |
|---|---|---|
| Headings, UI labels | Fira Sans | `font-sans` |
| Body text | Fira Sans | (default) |
| Code, hashes, numbers | Fira Code | `font-mono` |

**Import** (already in `index.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

**Type scale**:
- Hero heading: `text-4xl font-bold`
- Section heading: `text-2xl font-bold`
- Card heading: `text-lg font-semibold`
- Body: `text-sm` / `text-base`, `leading-6` (1.5)
- Mono (hashes, branch names): `text-xs font-mono text-slate-500`

---

## Component Patterns

### Cards
```html
<div class="bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-600 p-6 transition-all cursor-default">
```
- Always `border-slate-800` — never invisible borders in dark mode
- Hover: `hover:border-slate-600` for interactive cards, `hover:bg-slate-800/60` for list items
- No layout-shifting hover transforms (no `hover:scale-*`)

### Buttons — Primary CTA
```html
<button class="px-6 py-4 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors cursor-pointer">
```

### Buttons — Secondary
```html
<button class="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors cursor-pointer">
```

### Toolbar Buttons (compact icon+label)
```html
<button class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
  <IconComponent class="w-4 h-4" />
  <span class="hidden sm:inline">Label</span>
</button>
```
Group toolbar buttons in a `bg-slate-900 border border-slate-800 rounded-xl p-1` container with `w-px h-5 bg-slate-700` dividers between groups.

### Header / Navbar
```html
<header class="border-b border-white/5 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-40">
```
- Height: `h-14`
- Icon-only nav buttons with `aria-label` and tooltip `title`

### Modals / Overlays
```html
<div class="fixed inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center">
  <div class="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
```

---

## Icons

**Library**: [Lucide React](https://lucide.dev) — always use SVG icons, never emoji as UI icons.

| Use case | Icon | Size |
|---|---|---|
| Logo / git | `GitBranch` | `w-5 h-5` |
| Open folder | `Folder` | `w-5 h-5` |
| Remote clone | `Globe` | `w-5 h-5` |
| Settings | `Settings2` | `w-4 h-4` |
| Keyboard | `Keyboard` | `w-4 h-4` |
| GitHub link | `Github` | `w-4 h-4` |
| Stats | `BarChart2` | `w-4 h-4` |
| Heatmap | `CalendarDays` | `w-4 h-4` |
| Health | `HeartPulse` | `w-4 h-4` |
| Export | `Upload` | `w-4 h-4` |
| Share / Link | `Link` | `w-4 h-4` |
| Branch compare | `GitMerge` | `w-4 h-4` |
| Close | `X` | `w-3 h-3` — `w-4 h-4` |
| Add / New | `Plus` | `w-4 h-4` |
| Search empty state | `Search` | `w-12 h-12 text-slate-600` |
| Feature: tree | `TreePine` | `w-6 h-6 text-primary` |
| Feature: fast | `Zap` | `w-6 h-6 text-primary` |
| Feature: dark mode | `Moon` | `w-6 h-6 text-primary` |
| Feature: responsive | `Smartphone` | `w-6 h-6 text-primary` |

**Rules**:
- All icon-only buttons must have `aria-label` and `title`
- Use consistent `w-4 h-4` for toolbar/nav icons, `w-5 h-5` for primary actions, `w-6 h-6` for feature cards
- Never mix icon sizes randomly — stick to the scale above

---

## Accessibility

- **Contrast**: 4.5:1 minimum for normal text (WCAG AA). Use 7:1 for small text.
- **Focus states**: Always visible (`outline` or `ring`) for keyboard navigation
- **Touch targets**: Minimum 44×44px for all interactive elements
- **`aria-label`**: Required on all icon-only buttons
- **Form labels**: Always use `<label>` with `for` attribute
- **`prefers-reduced-motion`**: Respected via `index.css` — all animations disabled for users who prefer it

---

## Animations

| Context | Duration | Easing |
|---|---|---|
| Micro-interactions (hover, color) | `150ms` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Panel slide-in | `300ms` | `ease-out` |
| Fade in | `200ms` | `ease-out` |
| Scale in | `200ms` | `ease-out` |

**Rules**:
- Use `transform` and `opacity` only — never animate `width`, `height`, or `top/left`
- Always wrap in `@media (prefers-reduced-motion: reduce)` protection (handled globally in `index.css`)
- No animation longer than 300ms for UI transitions

---

## Dark Mode

- Strategy: Tailwind `class` dark mode (`darkMode: 'class'` in `tailwind.config.js`)
- The app is dark-first — background is `bg-slate-950` by default
- When implementing a future light mode toggle, add/remove the `dark` class on `<html>`
- Glass/transparent elements: use `bg-white/5` or higher opacity — never `bg-white/10` or lower in dark mode

---

## Responsive Breakpoints

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | 375px | Toolbar labels hidden (`hidden sm:inline`) |
| Tablet | 768px | Grid switches from 1→2 cols |
| Desktop | 1024px | Full layout |
| Wide | 1440px | Max container `max-w-7xl` |

---

## Pre-Delivery Checklist

Before shipping any UI change, verify:

- [ ] No emojis used as icons — use Lucide React SVG icons
- [ ] All clickable elements have `cursor-pointer`
- [ ] All icon-only buttons have `aria-label` and `title`
- [ ] Hover states provide clear visual feedback (color or background shift)
- [ ] Transitions are `150-300ms` smooth
- [ ] Focus states visible for keyboard navigation
- [ ] Text contrast meets 4.5:1 minimum (use `text-slate-400` minimum, not lighter)
- [ ] Borders visible in dark mode (`border-slate-800`, not `border-white/5` for cards)
- [ ] No content hidden behind sticky header (account for `h-14` top offset)
- [ ] Responsive at 375px, 768px, 1024px, 1440px — no horizontal scroll
- [ ] `prefers-reduced-motion` respected (handled globally, don't override)
- [ ] Commit hashes / branch names use `font-mono`
- [ ] Headings / UI labels use `font-sans` (Fira Sans)

---

## Stack Reference

- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS (`class` dark mode)
- **Icons**: Lucide React
- **Fonts**: Fira Sans (UI) + Fira Code (mono) via Google Fonts
- **Build**: Vite
