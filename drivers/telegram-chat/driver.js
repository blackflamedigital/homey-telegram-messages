'use strict';

const Homey = require('homey');
const { TelegramClient } = require('teleproto');
const { StringSession } = require('teleproto/sessions');
const QRCode = require('qrcode');

function serializePeer(peer, title) {
  if (!peer?.className) return null;
  switch (peer.className) {
    case 'InputPeerSelf': return { type: peer.className, peer: {}, title };
    case 'InputPeerChat': return { type: peer.className, peer: { chatId: String(peer.chatId) }, title };
    case 'InputPeerUser': return {
      type: peer.className,
      peer: { userId: String(peer.userId), accessHash: String(peer.accessHash) },
      title,
    };
    case 'InputPeerChannel': return {
      type: peer.className,
      peer: { channelId: String(peer.channelId), accessHash: String(peer.accessHash) },
      title,
    };
    default: return null;
  }
}

function deferred() {
  let resolve;
  let reject;
  let settled = false;
  const promise = new Promise((yes, no) => {
    resolve = (value) => { settled = true; yes(value); };
    reject = (error) => { settled = true; no(error); };
  });
  return { promise, resolve, reject, get settled() { return settled; } };
}

function authErrorMessage(error) {
  switch (error?.errorMessage) {
    case 'API_ID_INVALID':
      return 'Telegram rejected the API ID and hash. Check both values in API development tools.';
    default:
      return error?.errorMessage || error?.message || 'Telegram sign-in failed. Check your connection and try again.';
  }
}

module.exports = class TelegramChatDriver extends Homey.Driver {
  async onPair(session) {
    const state = {
      credentials: null,
      client: null,
      chats: [],
      waiting: null,
      abortController: null,
      cancelled: false,
    };
    this.log('Telegram Chat pairing started');
    this.sessions ??= new Map();
    this.sessions.set(session, state);

    session.setHandler('showView', async (viewId) => {
      this.log(`Pairing view changed: ${viewId}`);
    });
    const requestInput = async (stage, hint) => {
      state.waiting = deferred();
      await session.emit('telegram_qr_prompt', { stage, hint });
      return state.waiting.promise;
    };

    const createClient = () => {
      const stringSession = new StringSession('');
      const client = new TelegramClient(
        stringSession,
        state.credentials.apiId,
        state.credentials.apiHash,
        { connectionRetries: 1, requestRetries: 1, autoReconnect: false },
      );
      client.setLogLevel('none');
      return { client, stringSession };
    };

    const collectChats = async (client, stringSession) => {
      state.chats = [];
      const sessionString = stringSession.save();
      for await (const dialog of client.iterDialogs({ ignoreMigrated: true })) {
        const chat = serializePeer(dialog.inputEntity, dialog.title || 'Telegram chat');
        if (!chat) continue;
        const peerId = JSON.stringify(chat.peer);
        state.chats.push({
          name: chat.title,
          data: { id: `${chat.type}:${peerId}` },
          store: { telegram: { ...state.credentials, chat, session: sessionString } },
        });
      }
      if (!state.chats.length) throw new Error('No supported Telegram chats were found.');
      this.log(`Telegram sign-in succeeded; found ${state.chats.length} supported chats`);
      if (!state.cancelled) await session.showView('list_devices');
    };

    const runLogin = (client, stringSession, login) => {
      state.client = client;
      state.cancelled = false;
      void (async () => {
        try {
          await login();
          if (!state.cancelled) await collectChats(client, stringSession);
        } catch (error) {
          if (!state.cancelled && error?.name !== 'AbortError') {
            const message = authErrorMessage(state.lastAuthError || error);
            this.error('Telegram pairing failed:', message);
            try {
              await session.emit('telegram_qr_error', message);
            } catch (_) {
              // The pairing session may have been closed while authentication was running.
            }
          }
          if (state.waiting) {
            state.waiting.reject(new Error('Pairing cancelled.'));
            state.waiting = null;
          }
        } finally {
          if (state.client === client) state.client = null;
          state.abortController = null;
          void client.disconnect().catch(() => {});
        }
      })();
      return { ok: true };
    };

    session.setHandler('submit_telegram_credentials', async ({ apiId: rawApiId, apiHash }) => {
      const apiId = Number(rawApiId);
      if (!Number.isSafeInteger(apiId) || apiId <= 0 || !/^[a-f0-9]{32}$/i.test(apiHash || '')) {
        this.log('Pairing rejected malformed Telegram API credentials');
        return { ok: false, error: 'Enter a numeric API ID and a 32-character API hash from API development tools.' };
      }
      this.log('Telegram API credentials accepted by format check');
      state.credentials = { apiId, apiHash };
      return { ok: true };
    });

    session.setHandler('start_telegram_qr_login', async () => {
      if (!state.credentials) return { ok: false, error: 'Enter your Telegram API details first.' };
      if (state.client) return { ok: false, error: 'Telegram sign-in is already in progress.' };

      this.log('Telegram QR sign-in started');
      const { client, stringSession } = createClient();
      const abortController = new AbortController();
      state.abortController = abortController;
      state.lastAuthError = null;

      return runLogin(client, stringSession, async () => {
        await client.connect();
        await client.signInUserWithQrCode(
          { apiId: state.credentials.apiId, apiHash: state.credentials.apiHash },
          {
            qrCode: async ({ token, expires }) => {
              const loginUrl = `tg://login?token=${token.toString('base64url')}`;
              const dataUrl = await QRCode.toDataURL(loginUrl, {
                width: 280,
                margin: 2,
                errorCorrectionLevel: 'M',
              });
              if (!state.cancelled && !abortController.signal.aborted) {
                await session.emit('telegram_qr_code', { dataUrl, expires });
              }
            },
            password: async (hint) => requestInput(
              'password',
              hint
                ? `Enter your Telegram two-step verification password. Hint: ${hint}`
                : 'Enter your Telegram two-step verification password.',
              'telegram_qr_prompt',
            ),
            onError: async (error) => {
              state.lastAuthError = error;
              this.log('Telegram QR sign-in error:', error?.errorMessage || error?.message || 'unknown error');
              return true;
            },
            abortSignal: abortController.signal,
          },
        );
      });
    });

    session.setHandler('submit_telegram_input', async ({ value }) => {
      if (!state.waiting || typeof value !== 'string' || !value.trim()) {
        this.log('Pairing input rejected because no Telegram prompt was active');
        return { ok: false, error: 'Enter the requested Telegram sign-in information.' };
      }
      const pending = state.waiting;
      state.waiting = null;
      pending.resolve(value.trim());
      return { ok: true };
    });

    session.setHandler('list_devices', async () => state.chats);
    session.setHandler('disconnect', async () => {
      this.log('Telegram Chat pairing session disconnected');
      state.cancelled = true;
      state.abortController?.abort();
      if (state.waiting) state.waiting.reject(new Error('Pairing cancelled.'));
      if (state.client) void state.client.disconnect().catch(() => {});
      this.sessions.delete(session);
    });
  }
};
