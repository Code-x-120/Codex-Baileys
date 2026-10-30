"use strict";
var __importDefault = this && this.__importDefault || function (a) {
    return a && a.__esModule ? a : { "default": a }
};

Object.defineProperty(exports, "__esModule", { value: !0 });

const pino_1 = __importDefault(require("pino"));

// ── Codex: log level env se control — panel pe noise kam karne ke liye ──
// LOG_LEVEL=silent | fatal | error | warn | info | debug | trace   (default: warn)
// Purana default pino 'info' tha jo har message pe JSON dump karta tha.
const _cgLevel = (process.env.LOG_LEVEL || process.env.BAILEYS_LOG_LEVEL || 'warn').toLowerCase();
const _cgValid = ['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'];

exports.default = (0, pino_1.default)({
    level: _cgValid.includes(_cgLevel) ? _cgLevel : 'warn',
    timestamp: () => `,"time":"${new Date().toJSON()}"`
});
