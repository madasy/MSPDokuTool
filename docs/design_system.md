# MSP Doku Tool Design System

## Color Palette

### Dark Mode (Reference)
The user explicitly requested to keep this combination.

-   **Background**: `#0F172A` (Slate 900) - Main app background.
-   **Panel / Card Background**: `#1E293B` (Slate 800) with slight transparency/gradient.
-   **Text Primary**: `#FFFFFF` (White) or `#F1F5F9` (Slate 100).
-   **Text Secondary**: `#94A3B8` (Slate 400).
-   **Primary Brand**: `#14B8A6` (Teal 500) / `#2DD4BF` (Teal 400).

### Light Mode
-   **Background**: White `#FFFFFF` with a subtle **Green/Teal Gradient** overlay (defined in `index.css`).
-   **Sidebar**: `#FFFFFF` (White) with Slate 200 border.
-   **Text Primary**: `#0F172A` (Slate 900).
-   **Text Secondary**: `#475569` (Slate 600) / `#64748B` (Slate 500).

## Semantic Colors

| Role | Light | Dark |
| :--- | :--- | :--- |
| **Status OK** | `text-green-700 bg-green-100` | `text-green-300 bg-green-900/40` |
| **Status Warning** | `text-amber-800 bg-amber-100` | `text-amber-300 bg-amber-900/40` |
| **Status Error** | `text-red-800 bg-red-100` | `text-red-300 bg-red-900/40` |
| **Primary Action** | `bg-primary-500` | `bg-primary-500` |

### Gradients
The application uses a fixed background gradient in `body` to provide a "premium" feel.

```css
/* index.css */
background-image:
  radial-gradient(900px 500px at 15% -10%, rgba(20, 184, 166, 0.08), transparent 60%),
  radial-gradient(700px 350px at 90% 0%, rgba(59, 130, 246, 0.06), transparent 55%);
```
