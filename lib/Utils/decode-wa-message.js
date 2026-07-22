"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_ERROR_CODES = exports.NACK_REASONS = exports.DECRYPTION_RETRY_CONFIG = exports.ACCOUNT_RESTRICTED_TEXT = exports.MISSING_KEYS_ERROR_TEXT = exports.NO_MESSAGE_FOUND_ERROR_TEXT = exports.extractAddressingContext = exports.decryptMessageNode = exports.decodeMessageNode = void 0;
const boom_1 = require("@hapi/boom");
const WAProto_1 = require("../../WAProto");
const WABinary_1 = require("../WABinary");
const generics_1 = require("./generics");
exports.NO_MESSAGE_FOUND_ERROR_TEXT = 'Message absent from node';
exports.MISSING_KEYS_ERROR_TEXT = 'Key used already or never filled';
exports.ACCOUNT_RESTRICTED_TEXT = 'Your account has been restricted';
exports.DECRYPTION_RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 100,
    sessionRecordErrors: ['No session record', 'SessionError: No session record']
};
exports.NACK_REASONS = {
    SenderReachoutTimelocked: 463,
    ParsingError: 487,
    UnrecognizedStanza: 488,
    UnrecognizedStanzaClass: 489,
    UnrecognizedStanzaType: 490,
    InvalidProtobuf: 491,
    InvalidHostedCompanionStanza: 493,
    MissingMessageSecret: 495,
    SignalErrorOldCounter: 496,
    MessageDeletedOnPeer: 499,
    UnhandledError: 500,
    UnsupportedAdminRevoke: 550,
    UnsupportedLIDGroup: 551,
    DBOperationFailed: 552
};
exports.SERVER_ERROR_CODES = {
    MessageAccountRestriction: '463',
    SmaxInvalid: '479'
};
const extractAddressingContext = (stanza) => {
    let senderAlt;
    let recipientAlt;
    const sender = stanza.attrs.participant || stanza.attrs.from;
    const addressingMode = stanza.attrs.addressing_mode || (sender !== null && sender !== void 0 ? sender : '').endsWith('lid') ? 'lid' : 'pn';
    if (addressingMode === 'lid') {
        senderAlt = stanza.attrs.participant_pn || stanza.attrs.sender_pn || stanza.attrs.peer_recipient_pn;
        recipientAlt = stanza.attrs.recipient_pn;
    }
    else {
        senderAlt = stanza.attrs.participant_lid || stanza.attrs.sender_lid || stanza.attrs.peer_recipient_lid;
        recipientAlt = stanza.attrs.recipient_lid;
    }
    return { addressingMode, senderAlt, recipientAlt };
};
exports.extractAddressingContext = extractAddressingContext;
function decodeMessageNode(stanza, meId, meLid) {
    var _a;
    let msgType;
    let chatId;
    let author;
    let fromMe = false;
    const msgId = stanza.attrs.id;
    const from = stanza.attrs.from;
    const participant = stanza.attrs.participant;
    const recipient = stanza.attrs.recipient;
    if (!msgId) {
        throw new boom_1.Boom('Invalid message stanza: missing id attribute', { data: stanza });
    }
    if (!from) {
        throw new boom_1.Boom('Invalid message stanza: missing from attribute', { data: stanza });
    }
    const addressingContext = extractAddressingContext(stanza);
    const isMe = (jid) => (0, WABinary_1.areJidsSameUser)(jid, meId);
    const isMeLid = (jid) => (0, WABinary_1.areJidsSameUser)(jid, meLid);
    if ((0, WABinary_1.isJidUser)(from) || (0, WABinary_1.isLidUser)(from)) {
        if (recipient) {
            if (!isMe(from) && !isMeLid(from)) {
                throw new boom_1.Boom('receipient present, but msg not from me', { data: stanza });
            }
            if (isMe(from) || isMeLid(from)) {
                fromMe = true;
            }
            chatId = recipient;
        }
        else {
            if (isMe(from) || isMeLid(from)) {
                fromMe = true;
            }
            chatId = from;
        }
        msgType = 'chat';
        author = from;
    }
    else if ((0, WABinary_1.isJidGroup)(from)) {
        if (!participant) {
            throw new boom_1.Boom('No participant in group message');
        }
        if (isMe(participant) || isMeLid(participant)) {
            fromMe = true;
        }
        msgType = 'group';
        author = participant;
        chatId = from;
    }
    else if ((0, WABinary_1.isJidBroadcast)(from)) {
        if (!participant) {
            throw new boom_1.Boom('No participant in group message');
        }
        const isParticipantMe = isMe(participant);
        if ((0, WABinary_1.isJidStatusBroadcast)(from)) {
            msgType = isParticipantMe ? 'direct_peer_status' : 'other_status';
        }
        else {
            msgType = isParticipantMe ? 'peer_broadcast' : 'other_broadcast';
        }
        fromMe = isParticipantMe;
        chatId = from;
        author = participant;
    }
    else if ((0, WABinary_1.isJidNewsLetter)(from)) {
        msgType = 'newsletter';
        chatId = from;
        author = from;
        if (isMe(from) || isMeLid(from)) {
            fromMe = true;
        }
    }
    else {
        throw new boom_1.Boom('Unknown message type', { data: stanza });
    }
    const pushname = stanza === null || stanza === void 0 ? void 0 : stanza.attrs.notify;
    const key = {
        remoteJid: chatId,
        remoteJidAlt: !(0, WABinary_1.isJidGroup)(chatId) ? addressingContext.senderAlt : undefined,
        remoteJidUsername: !(0, WABinary_1.isJidGroup)(chatId)
            ? stanza.attrs.peer_recipient_username || stanza.attrs.recipient_username
            : undefined,
        fromMe,
        id: msgId,
        participant,
        participantAlt: (0, WABinary_1.isJidGroup)(chatId) ? addressingContext.senderAlt : undefined,
        participantUsername: stanza.attrs.participant ? stanza.attrs.participant_username : undefined,
        addressingMode: addressingContext.addressingMode,
        ...(msgType === 'newsletter' && stanza.attrs.server_id ? { server_id: stanza.attrs.server_id } : {})
    };
    const fullMessage = {
        key,
        category: stanza.attrs.category,
        messageTimestamp: +stanza.attrs.t,
        pushName: pushname,
        broadcast: (0, WABinary_1.isJidBroadcast)(from)
    };
    if (key.fromMe) {
        fullMessage.status = WAProto_1.proto.WebMessageInfo.Status.SERVER_ACK;
    }
    return {
        fullMessage,
        author,
        sender: msgType === 'chat' ? author : chatId
    };
}
exports.decodeMessageNode = decodeMessageNode;
const decryptMessageNode = (stanza, meId, meLid, repository, logger) => {
    const { fullMessage, author, sender } = decodeMessageNode(stanza, meId, meLid);
    return {
        fullMessage,
        category: stanza.attrs.category,
        author,
        async decrypt() {
            var _a;
            let decryptables = 0;
            if (Array.isArray(stanza.content)) {
                for (const { tag, attrs, content } of stanza.content) {
                    if (tag === 'verified_name' && content instanceof Uint8Array) {
                        const cert = WAProto_1.proto.VerifiedNameCertificate.decode(content);
                        const details = WAProto_1.proto.VerifiedNameCertificate.Details.decode(cert.details);
                        fullMessage.verifiedBizName = details.verifiedName;
                    }
                    if (tag === 'unavailable' && attrs.type === 'view_once') {
                        fullMessage.key.isViewOnce = true;
                    }
                    if (attrs.count && tag === 'enc') {
                        fullMessage.retryCount = Number(attrs.count);
                    }
                    if (tag !== 'enc' && tag !== 'plaintext') {
                        continue;
                    }
                    if (!(content instanceof Uint8Array)) {
                        continue;
                    }
                    decryptables += 1;
                    let msgBuffer;
                    let decryptionJid;
                    decryptionJid = author;
                    if (tag !== 'plaintext') {
                        const { senderAlt } = extractAddressingContext(stanza);
                        if (senderAlt) {
                            if (!global._lidMap) {
                                global._lidMap = {};
                            }
                            if ((0, WABinary_1.isLidUser)(senderAlt) && (0, WABinary_1.isJidUser)(author) && !global._lidMap[senderAlt]) {
                                global._lidMap[senderAlt] = author;
                                global._lidMap[author] = senderAlt;
                            }
                            if ((0, WABinary_1.isJidUser)(senderAlt) && (0, WABinary_1.isLidUser)(author) && !global._lidMap[author]) {
                                global._lidMap[author] = senderAlt;
                                global._lidMap[senderAlt] = author;
                            }
                        }
                    }
                    try {
                        const e2eType = tag === 'plaintext' ? 'plaintext' : attrs.type;
                        switch (e2eType) {
                            case 'skmsg':
                                msgBuffer = await repository.decryptGroupMessage({
                                    group: sender,
                                    authorJid: author,
                                    msg: content
                                });
                                break;
                            case 'pkmsg':
                            case 'msg':
                                msgBuffer = await repository.decryptMessage({
                                    jid: decryptionJid,
                                    type: e2eType,
                                    ciphertext: content
                                });
                                break;
                            case 'plaintext':
                                msgBuffer = content;
                                break;
                            default:
                                throw new Error('Unknown e2e type: ' + e2eType);
                        }
                        let msg = WAProto_1.proto.Message.decode(e2eType !== 'plaintext' ? (0, generics_1.unpadRandomMax16)(msgBuffer) : msgBuffer);
                        msg = ((_a = msg.deviceSentMessage) === null || _a === void 0 ? void 0 : _a.message) || msg;
                        if (msg.senderKeyDistributionMessage) {
                            try {
                                await repository.processSenderKeyDistributionMessage({
                                    authorJid: author,
                                    item: msg.senderKeyDistributionMessage
                                });
                            }
                            catch (err) {
                                logger.error({ key: fullMessage.key, err }, 'failed to process sender key distribution message');
                            }
                        }
                        if (fullMessage.message) {
                            Object.assign(fullMessage.message, msg);
                        }
                        else {
                            fullMessage.message = msg;
                        }

                    }
                    catch (err) {
                        logger.error({ key: fullMessage.key, err, messageType: tag === 'plaintext' ? 'plaintext' : attrs.type, sender, author }, 'failed to decrypt message');

                        fullMessage.messageStubType = WAProto_1.proto.WebMessageInfo.StubType.CIPHERTEXT;
                        fullMessage.messageStubParameters = [err.message.toString()];
                    }
                }
            }
            if (!decryptables && !(fullMessage.key && fullMessage.key.isViewOnce)) {
                fullMessage.messageStubType = WAProto_1.proto.WebMessageInfo.StubType.CIPHERTEXT;
                fullMessage.messageStubParameters = [exports.NO_MESSAGE_FOUND_ERROR_TEXT];
            }
        }
    };
};
exports.decryptMessageNode = decryptMessageNode;
function isSessionRecordError(error) {
    const errorMessage = (error === null || error === void 0 ? void 0 : error.message) || (error === null || error === void 0 ? void 0 : error.toString()) || '';
    return exports.DECRYPTION_RETRY_CONFIG.sessionRecordErrors.some(errorPattern => errorMessage.includes(errorPattern));
}
