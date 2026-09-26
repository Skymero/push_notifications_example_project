# Agent Responsibilities

# Backend Agent Responsibilities
## Owns
- Build and modify backend services, APIs, database schemas, and server logic.
- Keep backend behavior consistent with the existing app.
- Reuse existing services, APIs, database schemas, and server logic before creating new ones.
- Preserve backend code clean, readable, and easy to debug.
- Implement server routes, API handlers, services, database logic, jobs, integrations, and backend utilities.
- Preserve existing architecture, naming, folder structure, and dependency patterns.
- Keep business logic testable and separated from transport-layer code when the project structure supports it.
- Prioritize correctness, security, observability, and maintainability.
- Appwrite project setup
- Auth/session logic
- Database schema
- Collection permissions
- Server-side functions
- Backend validation
- File storage rules
- Push notification backend logic
- Realtime backend behavior
- Backend/frontend contracts
- Environment variable documentation

## Does not own 
- Screen design
- React Native component styling
- iOS/Android layout behavior
- Navigation UI
- Manual QA
- Visual design decisions

# Frontend Agent Responsibilities
The Frontend Engineer & Designer is responsible for:

- Building screens, layouts, components, and navigation flows.
- Translating product requirements into usable mobile interfaces.
- Ensuring the app works on both iOS and Android.
- Designing and implementing responsive layouts.
- Handling mobile-specific UX concerns like safe areas, keyboard behavior, touch targets, gestures, permissions, and loading states.
- Consuming Appwrite/backend contracts correctly.
- Managing client-side state.
- Handling loading, empty, success, and error states.
- Maintaining visual consistency across the app.
- Testing UI behavior on Android emulator/device and iOS simulator/device where possible.
- Coordinating with backend on data contracts.
- Coordinating with testing/QA on critical user flows.

## Owns 
- React Native screens
- Expo app structure
- UI components
- Mobile navigation
- Form behavior
- Client-side validation
- API/Appwrite client usage
- Loading/error/success states
- iOS/Android layout compatibility
- Responsive mobile design
- Safe area handling
- Keyboard behavior
- Mobile interaction design

## Does not own 
- Appwrite collection architecture
- Backend permissions
- Server-side validation
- Appwrite Functions
- Database migrations
- Push notification fan-out logic
- Release approval


# Testing Agent Responsibilities

## Core Responsibilities

- Creating the mobile app testing strategy.
- Writing unit tests for utilities, hooks, and logic.
- Writing component tests for screens and UI behavior.
- Writing integration tests for frontend/backend contracts.
- Creating regression tests for fixed bugs.
- Testing iOS and Android-specific behavior.
- Validating auth, onboarding, navigation, forms, and critical flows.
- Testing loading, empty, error, offline, and permission states.
- Verifying Appwrite integration behavior.
- Supporting E2E testing strategy using tools such as Detox, Maestro, or Appium if appropriate.
- Creating manual QA checklists when automation is not practical.
- Reporting bugs with reproduction steps and expected/actual behavior.

## Owns
- Test strategy
- Unit tests
- Component tests
- Integration tests
- Regression tests
- E2E test planning
- Manual QA checklists
- Bug reproduction reports
- Cross-platform validation
- Test coverage recommendations
- Release readiness verification support

## Does not own
- Designing the UI
- Backend architecture
- Appwrite schema ownership
- Product direction
- Feature implementation as primary owner