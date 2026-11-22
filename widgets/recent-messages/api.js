'use strict';

module.exports = {
  getMessages({ homey, params }) {
    return homey.app.getDeviceMessages(params.deviceId);
  },
};
