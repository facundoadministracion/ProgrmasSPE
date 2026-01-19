"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const admin = require("firebase-admin");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
exports.db = admin.firestore();
//# sourceMappingURL=firebaseAdmin.js.map