# HR Frontend Architecture

This module follows a layered structure so UI, API contracts, and domain logic are separated.

## Directory Contract

```text
src/
  Modules/
    HR/
      components/               # reusable HR micro-components
      pages/                    # thin view containers/screens
      routes/
        index.jsx               # module-specific routing
      api.js                    # HR API endpoint definitions
      services/
        api.js                  # auth/error-aware HTTP primitives
        hrService.js            # HR domain service wrappers
      selectors.js              # module-level Redux selectors
      index.jsx                 # module entry (re-export of routes)
```

## Responsibility Split

- `components/`
  - shared presentation units used by multiple HR pages.
- `pages/`
  - feature screens that orchestrate user interactions.
  - keep data-fetching calls delegated to `services/`.
- `api.js`
  - all HR backend endpoint constants and path helpers.
  - prevents URL duplication across pages.
- `services/api.js`
  - common authenticated fetch wrappers and error normalization.
- `services/hrService.js`
  - HR-specific operations built on top of transport layer.
- `selectors.js`
  - module selectors to avoid repeated inline Redux access logic.
- `routes/index.jsx`
  - HR-only routing map.
- `index.jsx`
  - stable module entry point consumed by app-level routes.

## Notes On Compatibility

- Existing imports using `src/routes/hr/index.jsx` are still supported.
- `src/routes/hr/index.jsx` now re-exports from `src/Modules/HR/api.js`.
- This keeps old call sites functional while using module-local API ownership.
