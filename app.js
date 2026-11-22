'use strict';

const Homey = require('homey');
const { Api, TelegramClient } = require('teleproto');
const { StringSession } = require('teleproto/sessions');

module.exports = class TelegramMessagesApp extends Homey.App {
  async onInit() {
    this.cache = new Map();
    this.pending = new Map();
  }

  async getDeviceMessages(deviceId) {
    const driver = this.homey.drivers.getDriver('telegram-chat');
    const devices = driver.getDevices();
    const device = devices.find((candidate) => (
      candidate.getId() === deviceId
      || candidate.id === deviceId
      || candidate.getData().id === deviceId
    ));
    if (!device) {
      this.log('Widget message request did not match a paired Telegram Chat device');
      return { status: 'setup', messages: [] };
    }
    const config = await device.getStoreValue('telegram');
    if (!config) {
      this.log('Widget message request matched a device without Telegram configuration');
      return { status: 'setup', messages: [] };
    }
    const key = `${deviceId}:${JSON.stringify(config.chat.peer)}`;
    const cached = this.cache.get(key);
    if (cached?.until > Date.now()) return cached.result;
    if (this.pending.has(key)) return this.pending.get(key);

    const request = this.readMessages(config, cached?.result.messages ?? []).then((result) => {
      if (this.pending.get(key) === request) {
        this.cache.set(key, { result, until: Date.now() + 25_000 });
        this.pending.delete(key);
      }
      return result;
    });
    this.pending.set(key, request);
    return request;
  }

  async readMessages(config, prior = []) {
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
        const history = await client.getMessages(peer, { limit: 20 });
        this.log(`Telegram history fetch succeeded for ${config.chat.title} (${config.chat.type}): ${history.length} messages`);
        const messages = history.map((message) => ({
          text: message.message || (message.media ? 'Media message' : 'Chat activity'),
          date: message.date * 1000,
          sender: message.sender
            ? [message.sender.firstName, message.sender.lastName].filter(Boolean).join(' ')
              || message.sender.title
              || message.sender.username
              || ''
            : message.postAuthor || (message.out ? 'You' : ''),
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
      this.error(`Telegram history fetch failed for ${config.chat.title}: ${code || error?.message || error?.name || 'unknown error'}`);
      const status = ['AUTH_KEY_UNREGISTERED', 'SESSION_REVOKED', 'AUTH_KEY_DUPLICATED']
        .includes(code) ? 'sign-in' : 'unavailable';
      return { status, title: config.chat.title, messages: prior };
    } finally {
      clearTimeout(timer);
      if (client) void client.disconnect().catch(() => {});
    }
  }
};
