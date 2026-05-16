Use this as the canonical design specification for all TL applications.

The goal is not “three different apps”.
The goal is:

* one ecosystem
* one visual language
* domain-specific accents

Your current Finance Core should become the master reference application.

The design direction aligns with modern dark SaaS dashboards and fintech-style control panels similar to contemporary dashboard systems and dark enterprise UI patterns. ([Dribbble][1])

---

# TL PLATFORM DESIGN SYSTEM

## Version 1.0

# Core Philosophy

Design goals:

* Dark-first
* Swiss-inspired minimalism
* Operational clarity
* Calm visual hierarchy
* Dense but readable
* Modern SaaS aesthetic
* Subtle premium feel
* No visual noise
* No excessive animation
* Consistent platform identity

Applications:

* TL Finance Core
* TL Logbook Dashboard
* TL Recipy Core

All applications MUST:

* share layout system
* share typography
* share spacing system
* share component system
* share sidebar behavior
* share interaction behavior

Applications may differ ONLY in:

* accent color
* iconography
* feature-specific visuals

---

# TECH STACK REQUIREMENTS

Use:

* TailwindCSS
* shadcn/ui
* Lucide Icons
* Framer Motion (minimal usage)
* CSS variables for theming

DO NOT USE:

* Material UI
* Bootstrap
* mixed icon systems
* neumorphism
* bright glassmorphism
* hard shadows
* pure black backgrounds

---

# GLOBAL COLOR SYSTEM

## Base Colors

```css
:root {
  --tl-bg-primary: #050816;
  --tl-bg-secondary: #0b1120;
  --tl-bg-tertiary: #111827;

  --tl-card: rgba(17, 24, 39, 0.72);

  --tl-border: rgba(255,255,255,0.06);

  --tl-text-primary: #f8fafc;
  --tl-text-secondary: #94a3b8;
  --tl-text-muted: #64748b;

  --tl-success: #10b981;
  --tl-warning: #f59e0b;
  --tl-danger: #ef4444;

  --tl-radius-sm: 12px;
  --tl-radius-md: 18px;
  --tl-radius-lg: 24px;

  --tl-shadow:
    0 0 0 1px rgba(255,255,255,0.03),
    0 12px 32px rgba(0,0,0,0.32);

  --tl-transition: 180ms ease;
}
```

---

# APPLICATION ACCENTS

## TL Finance Core

Theme:

* Wealth
* Professional
* Premium fintech

```css
--tl-accent: #7c3aed;
--tl-accent-soft: rgba(124,58,237,0.16);
```

---

## TL Logbook Dashboard

Theme:

* Aviation
* Precision
* Glass cockpit

```css
--tl-accent: #06b6d4;
--tl-accent-soft: rgba(6,182,212,0.14);
```

---

## TL Recipy Core

Theme:

* Warm
* Human
* Culinary

```css
--tl-accent: #f59e0b;
--tl-accent-soft: rgba(245,158,11,0.14);
```

---

# TYPOGRAPHY

Use:

* Inter
  OR
* Geist

Never mix fonts.

## Font Scale

```css
h1: 36px / 700
h2: 28px / 600
h3: 22px / 600
h4: 18px / 600

body: 15px / 400
small: 13px / 400
```

Rules:

* tight hierarchy
* no oversized hero text
* avoid uppercase labels except tiny metadata
* use medium weight instead of bold whenever possible

---

# BACKGROUND SYSTEM

All applications MUST use layered dark backgrounds.

## Main App Background

```css
background:
radial-gradient(
  circle at top left,
  rgba(124,58,237,0.08),
  transparent 30%
),
#050816;
```

Replace purple tint with app accent.

---

# SIDEBAR SYSTEM

All applications MUST use:

* identical sidebar width
* identical spacing
* identical animation timing
* identical hover states
* identical account section
* identical dark treatment

Sidebar style:

* floating panel feel
* soft border
* subtle backdrop blur

```css
backdrop-filter: blur(18px);
border-right: 1px solid rgba(255,255,255,0.05);
```

Active menu item:

* accent glow
* soft background
* no hard outlines

---

# CARD SYSTEM

Cards should feel layered and premium.

## Card Style

```css
background:
linear-gradient(
  180deg,
  rgba(255,255,255,0.03),
  rgba(255,255,255,0.01)
);

border: 1px solid rgba(255,255,255,0.05);

backdrop-filter: blur(12px);

box-shadow:
0 0 0 1px rgba(255,255,255,0.02),
0 12px 32px rgba(0,0,0,0.28);
```

Rules:

* no harsh borders
* no bright cards
* spacing > decoration
* use negative space heavily

---

# BUTTON SYSTEM

## Primary Button

* solid accent
* subtle glow
* rounded-xl
* hover brighten 5%

## Secondary Button

* transparent
* border only
* muted text
* hover uses accent tint

Never use:

* gradients on buttons
* heavy shadows
* glossy effects

---

# TABLES

Tables should:

* feel dense but breathable
* avoid grid overload
* use row hover states
* use muted separators

Hover:

```css
background: rgba(255,255,255,0.03);
```

---

# CHARTS

Charts MUST:

* use muted gridlines
* avoid rainbow colors
* use accent color as primary series
* use gray/blue secondary series

Finance:

* purple
  Logbook:
* cyan
  Recipy:
* amber

Charts should feel:

* Bloomberg Terminal Lite
* modern SaaS analytics
* calm and readable

---

# EMPTY STATES

Current empty states are too sparse.

New empty states MUST include:

* large icon
* onboarding checklist
* subtle illustration
* actionable CTA
* contextual helper text

Example:

```text
1. Add account
2. Import data
3. Configure categories
4. Review forecast
```

---

# MOTION

Animation philosophy:
“Operational software, not marketing website”

Allowed:

* fade
* soft scale
* hover elevation
* sidebar transitions

Duration:

```css
180ms–220ms
```

DO NOT:

* bounce
* overspring
* excessive parallax
* floating animations

---

# ICONOGRAPHY

Use ONLY:

* Lucide Icons

Rules:

* 1.5px stroke
* consistent sizing
* muted by default
* accent on active

---

# SPACING SYSTEM

Use 8px grid system.

Allowed spacing:

```text
4
8
12
16
24
32
48
64
```

Avoid inconsistent spacing.

---

# APPLICATION-SPECIFIC VISUAL DIRECTION

# TL Finance Core

Visual personality:

* premium fintech
* modern banking
* operational wealth dashboard

Influences:

* Linear
* Stripe
* modern fintech dashboards

Use:

* subtle purple glows
* clean KPI cards
* financial analytics styling

Avoid:

* crypto casino aesthetics
* neon overload

---

# TL Logbook Dashboard

Visual personality:

* EFB
* Garmin
* aviation instrumentation

Use:

* cyan accents
* slightly denser information layout
* map overlays
* aviation panel inspiration

Potential visual motifs:

* runway gridlines
* airspace overlays
* navigation instrumentation

Avoid:

* playful design
* warm palettes
* oversized rounded corners

---

# TL Recipy Core

Visual personality:

* premium kitchen notebook
* modern recipe management
* warm and tactile

Use:

* larger imagery
* softer cards
* ingredient-first hierarchy
* warm highlights

Potential visual motifs:

* subtle paper textures
* cooking timers
* tag chips

Avoid:

* enterprise dashboard feel
* dense analytics styling

---

# ICON DESIGN SPECIFICATIONS

All icons MUST:

* share same geometry
* same corner radius
* same lighting style
* same dark background treatment

Style:

* minimal
* geometric
* modern SaaS
* soft gradients
* rounded square container

---

# TL Finance Core Icon

Concept:

* financial layers
* stability
* structured growth

Icon:

* stacked vertical bars
* upward flow
* purple/cyan gradient

Visual:

* premium fintech
* similar sophistication to Linear or Arc browser

---

# TL Logbook Dashboard Icon

Concept:

* aviation navigation
* flight path
* instrumentation

Icon:

* stylized compass
  OR
* runway + flight arc

Colors:

* cyan
* blue
* dark steel

Feel:

* precision aviation tooling

---

# TL Recipy Core Icon

Concept:

* recipe organization
* culinary simplicity

Icon:

* recipe card
  OR
* minimal chef notebook
  OR
* layered ingredient stack

Colors:

* amber
* warm orange
* muted cream highlights

Feel:

* warm but modern

---

# IMPLEMENTATION REQUIREMENTS

Create shared package:

```text
@techlotse/tl-ui
```

Must contain:

* theme tokens
* card components
* sidebar
* typography
* buttons
* modal
* charts
* table styles
* animations
* app shell

All applications MUST consume shared package.

No duplicated UI code allowed.

---

# FINAL DESIGN DIRECTION

The final ecosystem should feel like:

“Swiss-engineered operational SaaS platform suite.”

Not:

* startup toy
* gaming UI
* crypto dashboard
* marketing-heavy web app

Priority order:

1. clarity
2. consistency
3. operational usability
4. premium subtlety
5. aesthetics

Use the existing TL Finance Core as the baseline reference for all future UI work. ([Dribbble][1])

[1]: https://dribbble.com/search/dark-saas-dashboard?utm_source=chatgpt.com "dark saas dashboard"
