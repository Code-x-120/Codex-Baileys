import makeWASocket from './Socket';
export * from '../WAProto';
export * from './Utils';
export * from './Types';
export * from './Store';
export * from './Defaults';
export * from './WABinary';
export * from './WAM';
export * from './WAUSync';

export type BroadcastResult = {
    total: number;
    sent: string[];
    failed: { jid: string; error: string }[];
    aborted: boolean;
};

export type BroadcastProgress = {
    status: 'start' | 'sent' | 'failed' | 'aborted' | 'end';
    done: number;
    total: number;
    sent: number;
    failed: number;
    jid?: string;
    error?: string;
};

export type BroadcastOptions = {
    concurrency?: number;
    minDelayMs?: number;
    jitterMs?: number;
    stopOnAuthError?: boolean;
    sendOptions?: Record<string, any>;
    onProgress?: (p: BroadcastProgress) => void;
};

export type WASocket = ReturnType<typeof makeWASocket> & {
    broadcast: (jids: string[], message: any, options?: BroadcastOptions) => Promise<BroadcastResult>;
    broadcastNewsletter: (jids: string[], message: any, options?: BroadcastOptions) => Promise<BroadcastResult>;
};

export { makeWASocket };
export default makeWASocket;
