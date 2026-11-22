'use strict';

const { execFileSync } = require('node:child_process');
const { createInterface } = require('node:readline/promises');
const { Writable } = require('node:stream');
const { TelegramClient } = require('teleproto');
const { StringSession } = require('teleproto/sessions');

let hidden = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!hidden) process.stdout.write(chunk, encoding);
    callback();
  },
});
const terminal = createInterface({ input: process.stdin, output, terminal: true });

async function ask(prompt, secret = false) {
  process.stdout.write(prompt);
  hidden = secret;
  try {
    return (await terminal.question('')).trim();
  } finally {
    hidden = false;
    if (secret) process.stdout.write('\n');
  }
}

async function main() {
  const apiId = Number(await ask('Telegram API ID: '));
  const apiHash = await ask('Telegram API hash: ', true);
  const bot = (await ask('Google Play Sales bot username: ')).replace(/^@?/, '@');
  if (!Number.isSafeInteger(apiId) || apiId <= 0 || !/^[a-f0-9]{32}$/i.test(apiHash) ||
    !/^@[A-Za-z0-9_]{5,32}$/.test(bot)) throw new Error('Invalid configuration');
  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 1 });
  client.setLogLevel('none');
  try {
    await client.start({
      phoneNumber: () => ask('Telegram phone number, including country code: ', true),
      phoneCode: () => ask('Code from Telegram: ', true),
      emailAddress: () => ask('Telegram login email: ', true),
      emailVerification: () => ask('Code from email: ', true),
      password: () => ask('Telegram two-step verification password: ', true),
      onError: (error) => { throw error; },
    });
    const peer = await client.getEntity(bot);
    if (!peer.bot) throw new Error('Username does not identify a bot');
    execFileSync('pbcopy', { input: JSON.stringify({ apiId, apiHash, bot, session: session.save() }) });
    process.stdout.write('Connection copied. Paste it into the Homey app settings.\n');
  } finally {
    await client.disconnect();
  }
}

main().catch(() => {
  process.stderr.write('Could not connect. Check your API details, bot username and Telegram sign-in.\n');
  process.exitCode = 1;
}).finally(() => terminal.close());
