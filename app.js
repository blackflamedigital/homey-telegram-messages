'use strict';

const Homey = require('homey');
const { Api, TelegramClient } = require('teleproto');
const { StringSession } = require('teleproto/sessions');

module.exports = class TelegramMessagesApp extends Homey.App {
  async onInit() {
    this.cache = null;
    this.pending = null;
    const clear = (key) => {
      if (key === 'telegram') {
        this.cache = null;
        this.pending = null;
      }
    };
    this.homey.settings.on('set', clear);
    this.homey.settings.on('unset', clear);
  }

  async getMessages() {
    const config = this.homey.settings.get('telegram');
    if (!config) return { status: 'setup', messages: [] };
    if (this.cache?.until > Date.now()) return this.cache.result;
    if (this.pending) return this.pending;

    const request = this.readMessages(config).then((result) => {
      if (this.pending === request) {
        this.cache = { result, until: Date.now() + 25_000 };
        this.pending = null;
      }
      return result;
    });
    this.pending = request;
    return request;
  }

  async readMessages(config) {
    const prior = this.cache?.result.messages ?? [];
    let client;
    let timer;
    try {
      client = new TelegramClient(
        new StringSession(config.session),
        config.apiId,
        config.apiHash,
        { connectionRetries: 1, requestRetries: 1, autoReconnect: false },
      );
      client.setLogLevel('none');

      const fetchMessages = async () => {
        await client.connect();
        const peer = new Api[config.chat.type](config.chat.peer);
        const history = await client.getMessages(peer, { limit: 5 });
        const messages = history.map((message) => ({
          text: message.message || (message.media ? 'Media message' : 'Chat activity'),
          date: message.date * 1000,
        }));
        return { status: 'ready', title: config.chat.title, messages };
      };

      return await Promise.race([
        fetchMessages(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Telegram read timed out')), 12_000);
        }),
      ]);
    } catch (error) {
      const code = error?.errorMessage;
      const status = ['AUTH_KEY_UNREGISTERED', 'SESSION_REVOKED', 'AUTH_KEY_DUPLICATED']
        .includes(code) ? 'sign-in' : 'unavailable';
      return { status, title: config.chat.title, messages: prior };
    } finally {
      clearTimeout(timer);
      if (client) void client.disconnect().catch(() => {});
    }
  }
};
