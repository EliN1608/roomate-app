# Roomate App - Design System & Architecture

This document outlines the design decisions, component hierarchy, color system, and layout directions for the Roomate App.

## Theme & Visual Style

The Roomate App utilizes a dark, premium aesthetic using curated dark green-yellow hues, high-contrast neon accents, clean typography, and RTL (Right-to-Left) direction as default.

### Color Palette (CSS Variables)

| Variable | Value | Description |
| :--- | :--- | :--- |
| `--bg-primary` | `#1A1E0F` | Deep dark olive-green background |
| `--bg-surface` | `#242A14` | Intermediate dark olive-green for card background |
| `--bg-surface-mid` | `#2E3618` | Slightly lighter green surface for active elements |
| `--accent` | `#C7FF2E` | High-contrast neon-lime for interactive highlights / primary actions |
| `--accent-soft` | `rgba(199, 255, 46, 0.13)` | Translucent neon-lime for backgrounds, borders, or highlights |
| `--text-primary` | `#FFFFFF` | Primary white text |
| `--text-secondary` | `#A8B89A` | Secondary soft grayish-green text |
| `--text-muted` | `#5A6B4A` | Muted low-contrast text for captions or labels |
| `--error` | `#FF4444` | High-visibility red for alerts / errors |
| `--border` | `rgba(255, 255, 255, 0.06)` | Subtle border for clean element separation |

### Border Radii

- **Cards:** `24px` (`--radius-card`)
- **Buttons:** `999px` (Pill-shaped, `--radius-btn`)
- **Inputs:** `14px` (`--radius-input`)

### Typography

- **Display Fonts:** `'Space Grotesk', sans-serif` (`--font-display`)
- **Body Fonts:** `'Inter', sans-serif` (`--font-body`)
- **Mono Fonts:** `'Space Mono', monospace` (`--font-mono`)

---

## Folder Structure & Routing

```
roomate-app/
  DESIGN.md
  src/
    main.jsx
    App.jsx
    styles/
      globals.css
    components/
      Navbar/
        Navbar.jsx
      Sidebar/
        Sidebar.jsx
      PrimaryButton/
        PrimaryButton.jsx
      TextInput/
        TextInput.jsx
      MetricCard/
        MetricCard.jsx
      ExpenseRow/
        ExpenseRow.jsx
    pages/
      LandingPage.jsx
      LoginPage.jsx
      OnboardingPage.jsx
      DashboardPage.jsx
      AddExpensePage.jsx
      ShoppingListPage.jsx
      ProfilePage.jsx
```

### Route Definitions

- `/` → `LandingPage`
- `/login` → `LoginPage`
- `/onboarding` → `OnboardingPage`
- `/dashboard` → `DashboardPage`
- `/expenses/add` → `AddExpensePage`
- `/shopping` → `ShoppingListPage`
- `/profile` → `ProfilePage`
