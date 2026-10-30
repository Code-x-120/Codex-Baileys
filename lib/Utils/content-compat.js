"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAdvancedContent = void 0;

// ── Codex: convenient message shapes → dugong/proto shapes ──
// Isse bot ko andar ke raw proto objects yaad rakhne ki zaroorat nahi.
//
// Supported shortcuts:
//   album: [ { image|video, caption }, ... ]
//   interactiveButtons: [ { name, buttonParamsJson } ] + text/title/footer
//   event: { name, description, startTime, endTime, location, ... }
//   product: { title, description, productImage, priceAmount1000, currencyCode, ... }
//   requestPayment: { amount, currency, from, note, sticker, background }
//   poll: { name, options, selectableCount, ... }
const normalizeAdvancedContent = (content) => {
    if (!content || typeof content !== 'object' || Buffer.isBuffer(content)) return content;
    const out = { ...content };

    // album carousel
    if (Array.isArray(out.album) && !out.albumMessage) {
        out.albumMessage = out.album;
        delete out.album;
    }

    // native-flow buttons (quick_reply / cta_url / cta_call / single_select ...)
    if (Array.isArray(out.interactiveButtons) && !out.interactiveMessage) {
        out.interactiveMessage = {
            title: out.text || out.body || '',
            header: out.title || '',
            footer: out.footer || '',
            buttons: out.interactiveButtons
        };
        if (out.thumbnail) out.interactiveMessage.thumbnail = out.thumbnail;
        if (out.image && typeof out.image === 'object' && !out.image.caption) out.interactiveMessage.image = out.image;
        if (out.video && typeof out.video === 'object' && !out.video.caption) out.interactiveMessage.video = out.video;
        if (out.nativeFlowMessage) out.interactiveMessage.nativeFlowMessage = out.nativeFlowMessage;
        if (out.contextInfo) out.interactiveMessage.contextInfo = out.contextInfo;
        if (out.externalAdReply) out.interactiveMessage.externalAdReply = out.externalAdReply;
        for (const k of ['interactiveButtons', 'nativeFlowMessage', 'externalAdReply']) delete out[k];
        // header media keys body se hata do (warna imageMessage bhi ban jayega)
        if (out.interactiveMessage.image) delete out.image;
        if (out.interactiveMessage.video) delete out.video;
        if (out.interactiveMessage.thumbnail) delete out.thumbnail;
    }

    // event invite
    if (out.event && !out.eventMessage) {
        out.eventMessage = out.event;
        delete out.event;
    }

    // business product card
    if (out.product && !out.productMessage) {
        const p = out.product;
        out.productMessage = {
            ...p,
            thumbnail: p.thumbnail || p.productImage,
            currencyCode: p.currencyCode || p.currency,
            priceAmount1000: p.priceAmount1000 ?? (p.price ? Number(p.price) * 1000 : undefined)
        };
        delete out.productMessage.productImage;
        delete out.product;
    }

    // payment request
    if (out.requestPayment && !out.requestPaymentMessage) {
        out.requestPaymentMessage = { ...out.requestPayment };
        delete out.requestPayment;
    }

    // poll (basic proto poll)
    if (out.poll && !out.pollCreationMessage) {
        const p = out.poll;
        out.pollCreationMessage = {
            name: p.name || p.question || '',
            options: (p.options || []).map(o => typeof o === 'string' ? { optionName: o } : o),
            selectableOptionsCount: p.selectableCount || p.selectableOptionsCount || 1
        };
        delete out.poll;
    }

    return out;
};

exports.normalizeAdvancedContent = normalizeAdvancedContent;
