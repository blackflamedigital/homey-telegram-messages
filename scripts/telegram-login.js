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

function describeChat({ inputEntity: peer, title }) {
  switch (peer.className) {
    case 'InputPeerSelf':
      return { type: peer.className, peer: {}, title };
    case 'InputPeerChat':
      return { type: peer.className, peer: { chatId: String(peer.chatId) }, title };
    case 'InputPeerUser':
      return {
        type: peer.className,
        peer: { userId: String(peer.userId), accessHash: String(peer.accessHash) },
        title,
      };
    case 'InputPeerChannel':
      return {
        type: peer.className,
        peer: { channelId: String(peer.channelId), accessHash: String(peer.accessHash) },
        title,
      };
  }
}

async function selectChat(client) {
  const query = (await ask('Filter chats by name, or press Enter to list all: ')).toLowerCase();
  const chats = [];
  for await (const dialog of client.iterDialogs({ ignoreMigrated: true })) {
    const chat = describeChat(dialog);
    if (chat?.title.toLowerCase().includes(query)) chats.push(chat);
  }
  if (!chats.length) throw new Error('No matching chats');
  chats.forEach(({ title }, index) => {
    const label = title.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ');
    process.stdout.write(`${index + 1}. ${label}\n`);
  });
  const selected = Number(await ask('Chat number: '));
  if (!Number.isInteger(selected) || !chats[selected - 1]) throw new Error('Invalid selection');
  return chats[selected - 1];
}

async function main() {
  const apiId = Number(await ask('Telegram API ID: '));
  const apiHash = await ask('Telegram API hash: ', true);
  if (!Number.isSafeInteger(apiId) || apiId <= 0 || !/^[a-f0-9]{32}$/i.test(apiHash)) throw new Error('Invalid configuration');
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
    const chat = await selectChat(client);
    const connection = JSON.stringify({ apiId, apiHash, chat, session: session.save() });
    if (process.platform === 'darwin') {
      execFileSync('pbcopy', { input: connection });
      process.stdout.write('Connection copied. Paste it into the Homey app settings.\n');
    } else {
      process.stdout.write('Copy this private connection into the Homey app settings.\n');
      process.stdout.write(connection + '\n');
    }
  } finally {
    await client.disconnect();
  }
}

main().catch(() => {
  process.stderr.write('Could not connect. Check your API details, chat selection and Telegram sign-in.\n');
  process.exitCode = 1;
}).finally(() => terminal.close());
