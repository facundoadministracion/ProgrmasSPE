'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPaymentFile = exports.revertPaymentBatch = exports.deleteParticipant = void 0;
/**
 * Este archivo es el punto de entrada principal para todas las Cloud Functions.
 * Su única responsabilidad es importar las funciones desde sus respectivos
 * archivos y exportarlas para que Firebase pueda desplegarlas.
 *
 * La inicialización del SDK de Admin se realiza en './firebaseAdmin.ts'
 * y cada función importa los servicios que necesita desde allí.
 */
// Importa las funciones individuales
const deleteParticipant_1 = require("./deleteParticipant");
Object.defineProperty(exports, "deleteParticipant", { enumerable: true, get: function () { return deleteParticipant_1.deleteParticipant; } });
const revertPaymentBatch_1 = require("./revertPaymentBatch");
Object.defineProperty(exports, "revertPaymentBatch", { enumerable: true, get: function () { return revertPaymentBatch_1.revertPaymentBatch; } });
const processPaymentFile_1 = require("./processPaymentFile");
Object.defineProperty(exports, "processPaymentFile", { enumerable: true, get: function () { return processPaymentFile_1.processPaymentFile; } });
//# sourceMappingURL=index.js.map