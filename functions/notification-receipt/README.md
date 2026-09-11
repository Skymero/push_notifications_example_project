# notification-receipt

Accepts Android device receipt events, verifies authenticated ownership against the recipient record and device token, writes an idempotent receipt document, and updates recipient/job status.

Appwrite Console settings:

* Runtime: Node.js TypeScript
* Root directory: `functions/notification-receipt`
* Build command: `npm install && npm run build`
* Entry point: `dist/notification-receipt/src/main.js`
* Execute access: authenticated users
