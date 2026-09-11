# Checklist: Require Confirmed Receipt For Green Receive Readiness

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 7.2, 7.3, 8.12, 8.13, 8.15, 10.3, 10.2, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially receive validation and receipt confirmation.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: receive readiness can become green by trusting the receive-validation function response instead of observing a device receipt.

Tasks:

- [ ] Define a validation attempt representation using notification recipient records or a dedicated validation record.
- [ ] Make `notification-receive-validation` return provider acceptance separately from device receipt.
- [ ] Keep receive readiness yellow while provider accepted but receipt is pending.
- [ ] Submit a `received` receipt from the Android device after processing the validation payload.
- [ ] Update the device-token record to `receiveStatus = verified` only after receipt authorization succeeds.
- [ ] Add timeout handling for expired validation attempts.
- [ ] Update `useNotificationReadiness` to observe the device-token or validation record after invoking validation.

Acceptance criteria:

- [ ] Provider acceptance alone never turns the receive LED green.
- [ ] Receive LED turns green only after the Android device submits an accepted receipt.
- [ ] Receive LED turns red on permission denial, invalid token, provider rejection, or validation expiration.

## Work Explanation

This work changes receive readiness from a simple function-response check into a receipt-confirmed validation flow. The backend may know FCM accepted a message, but the Android app must prove it processed the payload by submitting a receipt.

## Logic Behind It

The PRD explicitly separates provider acceptance from device receipt. This distinction prevents false green states where FCM accepted a push request but the device never displayed, processed, or confirmed the notification.
