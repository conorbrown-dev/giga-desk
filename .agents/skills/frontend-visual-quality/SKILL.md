---
name: frontend-visual-quality
description: Build or revise Giga Desk frontend UI and UX with reference-image analysis, responsive visual inspection, accessibility checks, and screenshot evidence. Use for React, CSS, Tailwind, page, form, dashboard, navigation, responsive, styling, or other visible interface work.
---

# Frontend visual quality

Treat a passing build as necessary but insufficient evidence for visible work.

## Establish the visual brief

1. Inspect every attached reference image before editing.
2. Write a compact private brief covering hierarchy, content density, spacing rhythm, typography scale, color roles, surfaces, navigation, interaction patterns, and desktop/mobile behavior.
3. Inspect the current route, shared components, tokens, and nearby tests. Preserve established product language and accessibility behavior.
4. Use references as design direction. Do not copy another product's branding or distinctive assets.

## Implement the smallest coherent system

- Prefer shared Tailwind tokens and focused components over page-specific arbitrary values.
- Make the primary action and current context immediately legible.
- Design empty, loading, error, validation, success, disabled, hover, and keyboard-focus states that the changed flow can reach.
- Check long content, narrow widths, overflow, tap targets, labels, landmarks, contrast, and reduced-motion behavior.
- Keep route components focused on orchestration and use Formik/Yup for forms.

## Render, inspect, and iterate

1. Run the affected component tests and real browser flow.
2. Render the actual changed route with representative data at 1440x900 and 390x844. Do not substitute a static mockup for the application.
3. Save screenshots beneath `test-results/visual-review/`, using the Work Package job ID in each filename when available.
4. Inspect both images, not merely their existence. Check hierarchy, alignment, clipping, whitespace, density, legibility, responsive reflow, and visible states against the brief and references.
5. Fix visible defects and repeat the render-inspect loop until both viewports are coherent.
6. Run typecheck, lint, component tests, E2E, and production build required by `AGENTS.md`.

When the Work Package requires visual review, return exactly one Desktop and one Mobile `visualEvidence` entry with repository-relative screenshot paths. Never report visual evidence for files you did not render and inspect.
