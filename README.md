# CODEX BAILEYS ⚡

<p align="center">
  <img src="https://i.ibb.co/zHHHGVrR/Codex.jpg" >
</p>

<p align="center">
  <strong>Advanced WhatsApp Web API Library – Built for Speed, Stability & Branding</strong>
</p>

---

## 🚀 Key Features

- 🛡️ **AI Tag (opt-in):** `WA_AI_TAG=1` set karne par outgoing private messages ke sath `biz_bot` node jata hai. Default **OFF** hai — isse DM commands "waiting" par atakna band ho gaya.
- ⚡ **Perfect Pairing:** Pair code flow stable — WS open hone ke baad hi code request hota hai.
- 🧠 **Optimized Socket:** Pre-key auto top-up (har 10 min check), ghost-close guard, 4h stream refresh friendly.
- 📊 **Runtime Stats:** `sock.getStats()` se uptime, sent/recv nodes, last receive gap, prekey count.
- 💓 **Cheap Keepalive:** `sock.ping()` — passive IQ, bot ko apna ping na banana pade.
- 📢 **Bulk Send:** `sock.broadcast(jids, message, opts)` — concurrency + jitter + per-chat progress.
- 🧾 **Telemetry Events:** `sock.ev.on('stream.error')` aur `sock.ev.on('auth.failure')`.
- 📦 **Latest Baileys:** Version fallback chain (fork → WhiskeySockets → live WA `sw.js` → bundled).
- 🔓 **Decrypted Core:** `lib/index.js`, `lib/Socket/newsletter.js` aur `lib/Utils/messages.js` ab readable (obfuscation hata di gayi).

---

## 📦 Installation

`package.json` me:

```json
"baileys": "git+https://github.com/Code-x-120/Codex-Baileys.git"
```

Ya npm style:

```json
"@whiskeysockets/baileys": "Code-x-120/Codex-Baileys"
```

Phir:

```bash
npm install --legacy-peer-deps
```

> Node.js **18+** required (`engines` me enforce hai).

---

## 🔑 Pairing

```js
const { makeWASocket, useMultiFileAuthState } = require('baileys')

const { state, saveCreds } = await useMultiFileAuthState('auth')
const sock = makeWASocket({ auth: state, printQRInTerminal: false })
sock.ev.on('creds.update', saveCreds)

if (!sock.authState.creds.registered) {
  const code = await sock.requestPairingCode('923xxxxxxxxx')
  console.log('Pair code:', code)
}
```

---

## 🧩 Naye APIs

### `sock.getStats()`

```js
const st = sock.getStats()
// {
//   uptimeMs, connected, lastRecvAgoMs,
//   sentNodes, recvNodes, reconnects, prekeysServer
// }
```

### `sock.ping()`

```js
await sock.ping() // lightweight IQ — rtt measure karne ke liye
```

### `sock.broadcast(jids, message, options)`

```js
const res = await sock.broadcast(groups, { text: 'Hello' }, {
  concurrency: 3,     // 1..5, default 3
  minDelayMs: 500,    // per-send minimum gap
  jitterMs: 500,      // random extra gap
  stopOnAuthError: true,
  onProgress: p => console.log(p.status, p.done, '/', p.total)
})
// res = { total, sent: [jid], failed: [{ jid, error }], aborted }
```

Progress event:

```js
sock.ev.on('broadcast.progress', p => { /* ... */ })
```

### `sock.broadcastNewsletter(jids, message, options)`

Newsletter JIDs ke liye wahi helper, `newsletterOptions` pass-through ke sath.

### Auth failure

```js
sock.ev.on('auth.failure', ({ statusCode }) => {
  // 401 / 403 / 419 => creds delete karke re-pair karo
})
```

### Stream errors

```js
sock.ev.on('stream.error', ({ reason, statusCode }) => {
  // 'ack', 'conflict', 'replaced', '503' etc.
})
```

---

## ✨ Advanced Message Shortcuts

`sendMessage` ab seedha yeh shapes leta hai (andar proto/dugong shape me convert ho jate hain):

```js
// View-once media
await sock.sendMessage(jid, { image: { url: 'x.jpg' }, caption: 'Ek dafa dekho', viewOnce: true })

// Native-flow buttons
await sock.sendMessage(jid, {
  text: 'Kya karna hai?',
  title: 'Menu',
  footer: 'Codex Mini Bot',
  interactiveButtons: [
    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Confirm', id: 'confirm' }) },
    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Website', url: 'https://example.com' }) }
  ]
})

// Album / carousel
await sock.sendAlbumMessage(jid, [
  { image: { url: 'a.jpg' }, caption: 'Pehli' },
  { image: { url: 'b.jpg' }, caption: 'Doosri' }
])

// Event invite
await sock.sendMessage(jid, { event: { name: 'Meeting', startTime: Date.now(), endTime: Date.now() + 3600000 } })

// Product card
await sock.sendMessage(jid, {
  product: { title: 'Tee', productImage: { url: 'p.jpg' }, priceAmount1000: 2000000, currencyCode: 'PKR' },
  businessOwnerJid: '923xxxxxxxxx@s.whatsapp.net'
})

// Payment request
await sock.sendMessage(jid, { requestPayment: { amount: 10000000, currency: 'PKR', from: '923xxxxxxxxx@s.whatsapp.net', note: 'Order #1' } })

// Poll
await sock.sendMessage(jid, { poll: { name: 'Food?', options: ['Pizza', 'Pasta'], selectableCount: 1 } })

// Phone number share/request (messages.js built-in)
await sock.sendMessage(jid, { text: 'Number share karo', requestPhoneNumber: true })
await sock.sendMessage(jid, { text: 'Mera number', sharePhoneNumber: true })
```

Helpers:

```js
await sock.sendMentionAll(groupJid, { text: 'Attention!' })
await sock.sendStatusMentions({ text: 'Status text' }, ['9231...', '9232...']) // max 5

const ids = await sock.findUserId('923xxxxxxxxx')
// { phoneNumber: '923...@s.whatsapp.net', lid: '123...@lid', raw }
await sock.getLIDForPN('923...@s.whatsapp.net')
await sock.getPNForLID('123...@lid')
```

> Note: `spoiler: true` is fork/proto me available nahi — WhatsApp ka spoiler field is proto build me nahi hai.

---

## ⚙️ Environment Variables

| Variable | Default | Kaam |
|---|---|---|
| `WA_AI_TAG` | off | `1` = private messages par AI/bot badge |
| `MAX_MSG_RETRY` | `5` | Baileys retry limit (max 20) |
| `WA_SYNC_HISTORY` | on | `0` = history sync off (RAM bachao) |
| `WA_DM_DEBUG` | off | `1` = DM send ka device/jid map console par log |
| `LOG_LEVEL` | `warn` | pino level: `silent`..`trace` |
| `WA_VERSION_TIMEOUT_MS` | `10000` | version fetch timeout |

---

## 📡 Official Channel

Follow: [`120363401988730209@newsletter`](https://whatsapp.com/channel/120363401988730209)

---

## 📄 License

MIT
