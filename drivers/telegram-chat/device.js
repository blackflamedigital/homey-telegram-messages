'use strict';

const Homey = require('homey');

module.exports = class TelegramChatDevice extends Homey.Device {
  async onInit() {
    this.log('Telegram chat device ready');
  }
};
