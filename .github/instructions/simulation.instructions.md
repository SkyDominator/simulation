---
applyTo: '**.tsx, **.ts, **.js, **.jsx, **.py'
---

## Development environment

* Backend: Python, FastAPI, Supabase
    * Backend source path: `./src/backend`
* Frontend: React, TypeScript, Vite
    * Frontend source path: `./src/my-pwa-frontend/src`

## App user environment

* Number of expected total users of app: 60~100 (internal use stage for now)
* Number of expected simultaneous users: 10~20

## General requirements for my app.

1. It is a PWA (Progressive Web App). It should run on both mobile devices (Android and iOS) and desktops (Windows OS) seamlessly.
2. It will not be uploaded to any App Store (e.g., Google Play, Apple App Store). It will be shared for installation and running to only a certain group of users via direct link or other means.
3. The app's main target device is mobile devices (Chrome browser in iPhone and Android), so the UI/UX should be optimized for mobile screens. However, it should also work well on desktop (Windows 10 or higher, Chrome browser) screens.
4. Think hard for implementing codes.
5. You can search online to utilize external and additional resources, packages, or libraries only if it fits my app project best. For example, [React Query](https://react-query.tanstack.com/) for data fetching and caching might be installed if it helps improve the app's performance or user experience given the current app structure and app user environment. No need to use unnecessary packages or libraries.
6. Test and validate the codes you suggested after code generation. Test for new features or critical parts of the code to ensure reliability and facilitate future changes.

## The guides for backend codes

Refer to [this document](./py.instructions.md)

## The guides for frontend codes

Refer to [this document](./react.instructions.md)
