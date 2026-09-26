# notification-receive-validation

> Retired source: do not deploy this function. Receive validation is routed through `notification-support`. The active workspace and package scripts exclude this folder; use the [two-function deployment guide](../../DOCS/Astra/Code-Reviews/Sep_1126_deployment_guide.md).

Sends a validation notification to the authenticated user's current Android device. A green receive state is granted only after `notification-receipt` receives the device confirmation.

Appwrite Console settings:

* Runtime: Node.js TypeScript
* Root directory: `functions/notification-receive-validation`
* Build command: `npm install && npm run build`
* Entry point: `dist/notification-receive-validation/src/main.js`
* Execute access: authenticated users
