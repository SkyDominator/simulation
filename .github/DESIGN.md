Design updates applied:

- Added Material UI (MUI) to modernize the app's look-and-feel following MD3 visual principles.
- Wrapped the application with MUI ThemeProvider and CssBaseline for consistent theming.
- Introduced a responsive `Shell` component with a top header and mobile bottom navigation.
- Replaced local `Button` and `Input` primitives with MUI versions while preserving existing APIs so no functional changes are required.
- Simplified global CSS (`src/index.css`) to avoid conflicts with MUI baseline and kept Tailwind utilities available.

Notes:
- App functionality and routes were not changed.
- No runtime secrets or network endpoints were modified.
- You should run `npm install` inside the frontend to fetch new dependencies before starting the dev server.

Try it (from project root):

```powershell
cd src/frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

If you prefer a darker look or further MD3 tuning, we can adjust the `src/theme.tsx` palette and typography settings.
