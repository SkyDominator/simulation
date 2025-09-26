# Copilot Instructions

This file provides instructions and context for AI coding assistants to help them behave right, and understand the project itself, coding patterns & conventions used in this repository. It is intended to improve the quality of code suggestions and completions.

## Basic behavioral patterns for ALL AI coding assistants (agents)

Adhere to the instructions in [agents.md](/.github/instructions/agents.md) for basic behavioral patterns.

## Project overview

**Light of Life Club Simulation** is a sophisticated Progressive Web App (PWA) that provides comprehensive financial simulation services for investment plan analysis. The application consists of a FastAPI backend with Python 3.11+ and a React 19+ frontend with TypeScript, integrated with Supabase for database, authentication, and storage.

**Core Features:**
- **Financial Simulation Engine**: 10 distinct investment plans (A, B, C, D, K, P, R, F, E, G) with varying parameters, investor lifecycles, and revenue calculations
- **Multi-step Authentication**: Whitelist verification → OTP SMS verification → Supabase OAuth (Google, Kakao)
- **Admin Content Management**: Notice board system and privacy policy versioning with publishing workflow
- **Progressive Web App**: Offline functionality, service worker caching, responsive mobile-first design
- **Real-time Simulation**: Complex financial calculations with result caching and memo functionality

The app is designed to be responsive and works optimally on both desktop and mobile devices with a mobile-first approach.

## Project environment

Here are the details of the project environment.

### App development environment

OS: Windows 11
IDE: Visual Studio Code
Internet Browser: Google Chrome, Screen Size: 1920x1080
Device: Desktop
Python: 3.11.6 or later
TypeScript: 5.8.3 or later
React: 19.1.0 or later

### App test environment

Here is the test environment:

* Desktop Target: (Windows 11, Google Chrome)
* Mobile Target: (iPhone 11 Pro, iOS 18.1.1, Google Chrome)
* Notes:
    * No CI/CD pipelines are set up yet.
    * Testing framework: Pytest for backend, Vitest and Playwright for frontend.
    * Frontend is tested via Vite dev on a Windows local machine (some other notebook for development machine, 5173 port).
    * Backend is tested with debugpy on a Windows local machine (some other notebook for development machine, 8001 port).

### App live environment

Here is the live environment:

* Desktop Target: (Windows 11+, Google Chrome)
* Mobile Target: 
    * iPhone 11+, iOS 18.1.1+, Google Chrome
    * Samsung Galaxy S21+, Android 12+, Google Chrome
* Notes:
    * Hosted on Supabase (PostgreSQL, Storage, Auth)
    * Frontend is served via Vite preview on a Windows local machine (MSI Notebook, 24 hours running, 4173 port).
    * Backend is served on a Windows local machine (MSI Notebook, 24 hours running, 8000 port).
    * No CI/CD pipelines are set up yet.

## Project details

For the project details, refer to the [the project details](/.github/instructions/project-details.md).

## Back-end Coding Guidelines

For the back-end coding guidelines, refer to the [back-end coding guidelines](/.github/instructions/backend-coding.md).


## Front-end Coding Guidelines

For the front-end coding guidelines, refer to the [front-end coding guidelines](/.github/instructions/frontend-coding.md).