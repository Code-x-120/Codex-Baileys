"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachExtras = void 0;

const { USyncQuery } = require("../WAUSync/USyncQuery");
const { USyncUser } = require("../WAUSync/USyncUser");
const { jidNormalizedUser, isJidGroup } = require("../WABinary");

// ── Codex: extra socket helpers — sab guarded, koi bhi fail ho to bot na ruke ──
const _normalizeJid = (input) => {
    const raw = String(input || '').trim();
    if (!raw) return null;
    if (raw.includes('@')) return raw;
    const digits = raw.replace(/[^0-9]/g, '');
    return digits ? `${digits}@s.whatsapp.net` : null;
};

const attachExtras = (sock) => {
    if (!sock || typeof sock.sendMessage !== 'function') return sock;
    if (sock.sendAlbumMessage) return sock;

    // Album / carousel — ek hi message me multiple images/videos
    sock.sendAlbumMessage = async (jid, album, options = {}) => {
        if (!Array.isArray(album) || !album.length) throw new Error('album array khali hai');
        return sock.sendMessage(jid, { album }, options);
    };

    // Mention-all shortcut — group ke sab members tag
    sock.sendMentionAll = async (jid, content, options = {}) => {
        try {
            if (!isJidGroup(jid) || typeof sock.groupMetadata !== 'function') {
                return sock.sendMessage(jid, content, options);
            }
            const meta = await sock.groupMetadata(jid);
            const mentions = (meta?.participants || []).map(p => p.id).filter(Boolean);
            return sock.sendMessage(jid, { ...content, mentions }, options);
        }
        catch (e) {
            return sock.sendMessage(jid, content, options);
        }
    };

    // Status post + max 5 mentions (WhatsApp limit)
    sock.sendStatusMentions = async (content, mentions = [], options = {}) => {
        const list = [...new Set((Array.isArray(mentions) ? mentions : [mentions])
            .map(_normalizeJid).filter(Boolean))].slice(0, 5);
        if (!list.length) throw new Error('status ke liye kam az kam 1 mention chahiye');
        return sock.sendMessage('status@broadcast', { ...content, mentions: list }, {
            ...options,
            statusJidList: list
        });
    };

    // LID ↔ PN lookup (USync) — number do ya lid, dono IDs wapas
    sock.findUserId = async (input) => {
        const jid = _normalizeJid(input);
        if (!jid) throw new Error('valid number ya lid do');
        const isLid = jid.endsWith('@lid');
        const query = new USyncQuery().withLIDProtocol();
        const user = new USyncUser();
        user.withId(jid);
        if (isLid) user.withLid(jid);
        else user.withPhone(jid);
        query.withUser(user);
        if (typeof sock.executeUSyncQuery !== 'function') throw new Error('USync unavailable');
        const res = await sock.executeUSyncQuery(query);
        const item = (res?.list || [])[0] || {};
        let lid = item.lid || (isLid ? jid : null);
        if (lid && !String(lid).includes('@')) lid = `${lid}@lid`;
        let phoneNumber = isLid ? null : jid;
        if (isLid && item.id && !String(item.id).endsWith('@lid')) phoneNumber = item.id;
        return { phoneNumber, lid, raw: item };
    };

    // Convenience aliases (upstream-style names)
    sock.getLIDForPN = async (pn) => (await sock.findUserId(pn)).lid;
    sock.getPNForLID = async (lid) => (await sock.findUserId(lid)).phoneNumber;

    // Quoted-message helper — jid/participant raw rakhna padta hai
    sock.normalizeJid = (jid) => {
        try { return jidNormalizedUser(jid); } catch { return jid; }
    };

    return sock;
};

exports.attachExtras = attachExtras;
