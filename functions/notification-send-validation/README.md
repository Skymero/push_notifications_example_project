# notification-send-validation

> Retired source: do not deploy this function. Send readiness is routed through `notification-support`. The active workspace and package scripts exclude this folder; use the [two-function deployment guide](../../DOCS/Astra/Code-Reviews/Sep_1126_deployment_guide.md).

Checks whether the authenticated Appwrite session can reach a deployed function. It does not send to FCM and does not read device tokens.

Appwrite Console settings:

* Runtime: Node.js TypeScript
* Root directory: `functions/notification-send-validation`
* Build command: `npm install && npm run build`
* Entry point: `dist/notification-send-validation/src/main.js`
* Execute access: authenticated users
