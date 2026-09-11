# Checklist: Android Install Readiness

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 3.1, 3.3, 8.2, 8.8, 17, 20.3, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially registration and device setup.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: the app is not ready to install on Android devices because native config and build metadata are incomplete.

Tasks:

- [ ] Replace placeholder Android package `com.example.pushnotification` with the final app package ID.
- [ ] Add Android Firebase `google-services.json` outside source control if it contains environment-specific values.
- [ ] Configure the React Native Firebase Expo plugins for Android builds.
- [ ] Add `eas.json` with Android development and production build profiles.
- [ ] Fill `extra.eas.projectId` in `app.json` after creating/linking the EAS project.
- [ ] Confirm Android notification runtime permission `POST_NOTIFICATIONS`.
- [ ] Confirm Android notification channel creation before display.
- [ ] Document Android physical-device setup in `README.md`.
- [ ] Run `npx expo prebuild --platform android` in a clean branch or controlled environment.
- [ ] Run `npm run android` on a physical Android device.

Acceptance criteria:

- [ ] A clean checkout can install dependencies and produce an Android development build.
- [ ] The Android app requests notification permission after sign-in.
- [ ] The Android app can retrieve an FCM token on a physical device.
- [ ] No iOS or web readiness is required for this pass.

## Work Explanation

This work converts the Expo scaffold into an Android-installable app. It covers package identity, Firebase native configuration, EAS build profiles, and physical-device validation needed before FCM can be trusted.

## Logic Behind It

FCM tokens are issued to a registered Android application identity, not to a generic JavaScript project. The PRD requires a development or production native build, so the app cannot be called install-ready until Firebase, Expo, and Android package metadata all point to the same real Android app.
