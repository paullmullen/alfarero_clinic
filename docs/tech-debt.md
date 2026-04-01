## 🌳 Future Improvement: Tree Shaking & Bundle Optimization

### Context

As part of the scanner-driven patient flow work, we identified opportunities to reduce bundle size and improve performance by applying tree shaking and modular imports.

### Why this matters

Tree shaking removes unused code from the final bundle, which can:

- improve frontend load times
- reduce memory usage
- make the app more responsive on lower-end devices

### Current state

- Cloud Functions use the `firebase-admin` namespaced SDK (acceptable for now)
- Frontend likely includes some non-tree-shakeable imports
- Optimization has not yet been a priority vs. feature delivery

### Future work

When time allows, revisit:

#### 1. Frontend (highest priority)

- Replace broad imports with selective ones
- Audit large libraries (e.g., lodash, charting libs)
- Ensure ES module usage for better tree shaking

#### 2. Firebase usage

- Consider modular SDK patterns where beneficial
- Avoid mixing namespaced and modular styles

#### 3. Bundle analysis

- Use tools like:
  - `source-map-explorer`
  - `webpack-bundle-analyzer`

- Identify large or unused dependencies

### Guiding principle

> “Only ship what you actually use.”

### Priority

Low (performance optimization), revisit after major feature work stabilizes.
