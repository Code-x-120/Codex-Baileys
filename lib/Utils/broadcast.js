"use strict";
var __importDefault = this && this.__importDefault || function (a) {
    return a && a.__esModule ? a : { "default": a }
};

Object.defineProperty(exports, "__esModule", { value: true });
exports.attachBroadcast = void 0;

// ── Codex: sock.broadcast() — WhatsApp-friendly bulk send ──
// Bot-side loops me har chat par manual sendMessage + 80ms delay likhne ki zaroorat nahi.
//
// Usage:
//   const res = await sock.broadcast(jids, { text: 'Hello' }, {
//     concurrency: 3,      // ek waqt me kitne chats (default 3, max 5)
//     minDelayMs: 500,     // har send ke baad minimum gap
//     jitterMs: 500,       // random extra gap (rate-limit se bachne ke liye)
//     onProgress: (p) => {} // { done, total, sent, failed, jid }
//   });
//   // res = { total, sent: [jid], failed: [{ jid, error }] }
//
// Progress socket event: sock.ev.on('broadcast.progress', p)

const _sleep = (ms) => new Promise(r => setTimeout(r, ms));

const attachBroadcast = (sock) => {
    if (!sock || typeof sock.sendMessage !== 'function') return sock;
    if (sock.broadcast) return sock;

    sock.broadcast = async (jids, message, options = {}) => {
        const list = [...new Set((Array.isArray(jids) ? jids : [jids]).filter(Boolean))];
        const total = list.length;
        const concurrency = Math.min(5, Math.max(1, parseInt(options.concurrency, 10) || 3));
        const minDelayMs = Math.max(0, parseInt(options.minDelayMs, 10) || 500);
        const jitterMs = Math.max(0, parseInt(options.jitterMs, 10) || 500);
        const stopOnAuthError = options.stopOnAuthError !== false;
        const sendOpts = options.sendOptions || {};

        const sent = [];
        const failed = [];
        let cursor = 0;
        let aborted = false;

        const emit = (payload) => {
            const p = { ...payload, total, sent: sent.length, failed: failed.length };
            try { sock.ev.emit('broadcast.progress', p); } catch { }
            try { if (typeof options.onProgress === 'function') options.onProgress(p); } catch { }
        };

        const worker = async () => {
            while (!aborted) {
                const idx = cursor++;
                if (idx >= total) return;
                const jid = list[idx];
                try {
                    await sock.sendMessage(jid, message, sendOpts);
                    sent.push(jid);
                    emit({ done: sent.length + failed.length, jid, status: 'sent' });
                }
                catch (error) {
                    failed.push({ jid, error: error?.message || String(error) });
                    emit({ done: sent.length + failed.length, jid, status: 'failed', error: failed[failed.length - 1].error });
                    const code = error?.output?.statusCode || error?.statusCode;
                    if (stopOnAuthError && (code === 401 || code === 403 || code === 419)) {
                        aborted = true;
                        emit({ done: sent.length + failed.length, jid, status: 'aborted', error: 'auth-error' });
                        return;
                    }
                }
                await _sleep(minDelayMs + Math.floor(Math.random() * jitterMs));
            }
        };

        emit({ done: 0, status: 'start' });
        await Promise.all(Array.from({ length: Math.min(concurrency, total || 1) }, () => worker()));
        emit({ done: sent.length + failed.length, status: 'end' });

        return { total, sent, failed, aborted };
    };

    // Channel/status style bulk post (newsletter jids)
    sock.broadcastNewsletter = async (jids, message, options = {}) => sock.broadcast(jids, message, {
        ...options,
        sendOptions: { ...(options.sendOptions || {}), ...(options.newsletterOptions || {}) }
    });

    return sock;
};

exports.attachBroadcast = attachBroadcast;
