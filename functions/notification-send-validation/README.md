# notification-send-validation

Checks whether the authenticated Appwrite session can reach a deployed function. It does not send to FCM and does not read device tokens.

Appwrite Console settings:

* Runtime: Node.js TypeScript
* Root directory: `functions/notification-send-validation`
* Build command: `npm install && npm run build`
* Entry point: `dist/notification-send-validation/src/main.js`
* Execute access: authenticated users
