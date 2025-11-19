# Agent Guidelines for Pitch Viewer

## Build Commands
- Full build: `npm run build`
- CSS build: `npm run build:css` (lints SCSS, compiles to compressed CSS, autoprefixes)
- JS build: `npm run build:js` (webpack production build with ESLint)
- HTML build: `npm run build:html` (PostHTML processing)
- Images: `npm run build:images` (copy to dist/images)

## Lint Commands
- CSS lint: `npm run css:lint` (stylelint with postcss-scss syntax)
- JS lint: Integrated in webpack build via eslint-webpack-plugin

## Test Commands
- No test framework configured (package.json test script exits with error)

## Development
- Watch mode: `npm run watch` (runs all watch tasks in parallel)
- Serve: `npm run serve` (browser-sync from dist/)

## Code Style Guidelines

### TypeScript
- ES modules with import/export syntax
- TypeScript 5.x with strict mode enabled
- Target ES2020 for modern browser support
- Single quotes for strings
- Always use semicolons
- ESLint: flat config with recommended rules + custom (semi: always, quotes: single)
- Variable declarations: `const`/`let` preferred over `var`
- Function declarations: traditional or arrow functions as appropriate
- Naming: camelCase for variables/functions, PascalCase for classes/interfaces
- Explicit types for function parameters and return values
- Interface definitions for complex objects (e.g., note structures)
- Modal functionality with proper accessibility (ARIA attributes, keyboard navigation)
- CSS custom properties for dynamic UI updates
- localStorage for user preferences (theme, key)

### SCSS/CSS
- Variables in separate `_variables.scss` files
- Compressed output style
- Stylelint: flat config with rules (block-no-empty, color-hex-length: short, color-no-invalid-hex)
- Property ordering: logical groups (positioning, box model, typography, etc.)
- CSS custom properties for theming (dark/light mode)
- Responsive design with mobile-first approach
- Prefers-color-scheme media query for automatic theme switching
- Modal styling with backdrop blur and proper z-indexing
- Gradient indicators with CSS custom properties for dynamic positioning

### HTML
- PostHTML with modules for component inclusion
- Standard HTML5 structure with semantic elements
- Responsive viewport meta tag
- Accessible form controls with proper labels
- Modal dialogs with proper ARIA attributes
- SVG icons for UI elements

### General
- ES modules: "type": "module" in package.json
- TypeScript with strict mode and ES2020 target
- Modular architecture: separate modules for pitch detection, staff rendering, gradient indicators, settings modal, and theme management
- No test framework - manual testing approach
- Dependencies: pitchy (with custom types), teoria (with custom types), vexflow (with @types/vexflow)
- Modern tooling: sass, webpack 5 with ts-loader, ESLint 9, Stylelint flat config, TypeScript 5.x
- Responsive design supporting mobile devices
- Automatic dark/light mode based on user preference
- Manual theme override in settings (light/dark/auto)
- Settings modal for microphone and appearance configuration
- Visual pitch accuracy indicators with themed gradients
- Comet-like trailing line effect behind spark indicator (50-point history with fading colors)
- Debug mode with chromatic note slider and cents offset controls
- Two-panel layout: pitch display with key selector and note information