#!/usr/bin/env node
// Übernommen aus dem Projekt game01 (eigener Bot, damit sich die Antworten nicht vermischen).
// Telegram-Bot, über den Claude dem Nutzer Updates und Fragen schickt.
// Zugangsdaten liegen außerhalb des Repos: ~/.config/mimi_mots/telegram.env (nie committen)
//   TELEGRAM_BOT_TOKEN=...   (von @BotFather)
//   TELEGRAM_CHAT_ID=...     (trägt `setup` selbst ein)
//
// Befehle:
//   setup [--wait s]              Chat-ID aus der letzten Nachricht an den Bot ermitteln
//   send <text>                   Textnachricht (Markdown-frei, damit nichts falsch formatiert)
//   photo <datei> [beschriftung]  Bild senden (z. B. Screenshot)
//   ask <frage> <option>...       Frage mit Knöpfen; wartet (max. --wait Sekunden, Standard 0) auf die Antwort
//   inbox [--wait s]              Neue Nachrichten/Knopfdrücke des Nutzers ausgeben
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';

const DIR = join(homedir(), '.config', 'mimi_mots');
const ENV = join(DIR, 'telegram.env');
const OFFSET = join(DIR, 'telegram.offset');

function loadEnv() {
  if (!existsSync(ENV)) fail(`Fehlt: ${ENV} (TELEGRAM_BOT_TOKEN=... eintragen)`);
  const env = {};
  for (const line of readFileSync(ENV, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  if (!env.TELEGRAM_BOT_TOKEN) fail('TELEGRAM_BOT_TOKEN fehlt in ' + ENV);
  return env;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function api(token, method, body) {
  const opts = { method: 'POST' };
  if (body instanceof FormData) opts.body = body;
  else if (body) {
    opts.headers = { 'content-type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, opts);
  const json = await res.json();
  if (!json.ok) fail(`Telegram ${method}: ${json.description}`);
  return json.result;
}

/** Wie `api`, bricht aber nicht ab: für Quittungen, die scheitern dürfen (z. B. alter Knopfdruck). */
async function tryApi(token, method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) console.error(`Hinweis: Telegram ${method}: ${json.description}`);
    return json.ok ? json.result : null;
  } catch (e) {
    console.error(`Hinweis: Telegram ${method}: ${e.message}`);
    return null;
  }
}

function readOffset() {
  return existsSync(OFFSET) ? Number(readFileSync(OFFSET, 'utf8')) || 0 : 0;
}

/** Holt neue Updates (long polling bis `wait` s) und merkt sich den Stand. */
async function poll(token, wait = 0) {
  const updates = await api(token, 'getUpdates', {
    offset: readOffset(),
    timeout: wait,
  });
  if (updates.length) writeFileSync(OFFSET, String(updates.at(-1).update_id + 1));
  return updates;
}

function describe(u) {
  if (u.callback_query)
    return {
      chat: u.callback_query.message?.chat.id,
      text: `[Knopf] ${u.callback_query.data}`,
      cb: u.callback_query,
    };
  const m = u.message ?? u.edited_message;
  if (!m) return null;
  return { chat: m.chat.id, text: m.text ?? m.caption ?? '[Anhang]' };
}

/**
 * Quittiert einen Knopfdruck: kurzer Hinweis und die Frage wird so umgeschrieben,
 * dass statt der Knöpfe die gewählte Antwort darunter steht.
 */
async function acknowledge(token, cb) {
  await tryApi(token, 'answerCallbackQuery', {
    callback_query_id: cb.id,
    text: 'Angekommen.',
  });
  const msg = cb.message;
  if (!msg) return cb.data;
  const buttons = msg.reply_markup?.inline_keyboard?.flat() ?? [];
  const label = buttons.find((b) => b.callback_data === cb.data)?.text ?? cb.data;
  const body = { chat_id: msg.chat.id, message_id: msg.message_id };
  // Bei Fotos mit Knöpfen steht die Frage in der Beschriftung.
  if (msg.text !== undefined)
    await tryApi(token, 'editMessageText', {
      ...body,
      text: `${msg.text}\n\n✅ Antwort: ${label}`,
    });
  else
    await tryApi(token, 'editMessageCaption', {
      ...body,
      caption: `${msg.caption ?? ''}\n\n✅ Antwort: ${label}`.trim(),
    });
  return label;
}

/** Entfernt die Knöpfe einer Frage, wenn per Text statt per Knopf geantwortet wurde. */
async function closeQuestion(token, chat, messageId, answer) {
  const short = answer.length > 200 ? answer.slice(0, 200) + '…' : answer;
  await tryApi(token, 'editMessageReplyMarkup', {
    chat_id: chat,
    message_id: messageId,
  });
  await tryApi(token, 'sendMessage', {
    chat_id: chat,
    text: `✅ Antwort angekommen: ${short}`,
    reply_parameters: { message_id: messageId },
  });
}

/** callback_data: höchstens 64 Bytes; bei zu langen Texten gekürzt, eindeutig per Index. */
function callbackData(option, i) {
  if (Buffer.byteLength(option) <= 64) return option;
  let s = option;
  while (Buffer.byteLength(`${s}…#${i}`) > 64) s = s.slice(0, -1);
  return `${s}…#${i}`;
}

function waitArg(args) {
  const i = args.indexOf('--wait');
  if (i < 0) return 0;
  const s = Number(args[i + 1]) || 0;
  args.splice(i, 2);
  return s;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const env = loadEnv();
  const token = env.TELEGRAM_BOT_TOKEN;
  const needChat = () => env.TELEGRAM_CHAT_ID || fail('Erst `setup` ausführen (Chat-ID fehlt).');

  switch (cmd) {
    case 'setup': {
      const deadline = Date.now() + waitArg(args) * 1000;
      let updates = await api(token, 'getUpdates', { timeout: 0 });
      while (!updates.length && Date.now() < deadline) {
        updates = await api(token, 'getUpdates', {
          timeout: Math.min(50, Math.ceil((deadline - Date.now()) / 1000)),
        });
      }
      const last = updates.map(describe).filter(Boolean).at(-1);
      if (!last) fail('Keine Nachricht gefunden – bitte dem Bot erst „/start“ schreiben.');
      mkdirSync(DIR, { recursive: true });
      const lines = readFileSync(ENV, 'utf8')
        .split('\n')
        .filter((l) => l && !l.startsWith('TELEGRAM_CHAT_ID='));
      lines.push(`TELEGRAM_CHAT_ID=${last.chat}`);
      writeFileSync(ENV, lines.join('\n') + '\n', { mode: 0o600 });
      if (updates.length) writeFileSync(OFFSET, String(updates.at(-1).update_id + 1));
      await api(token, 'sendMessage', {
        chat_id: last.chat,
        text: 'Verbunden. Hier kommen ab jetzt Updates und Fragen zu Mimi & Mots.',
      });
      console.log('Chat-ID gespeichert.');
      break;
    }
    case 'send': {
      if (!args.length) fail('Text fehlt.');
      await api(token, 'sendMessage', {
        chat_id: needChat(),
        text: args.join(' '),
      });
      console.log('gesendet');
      break;
    }
    case 'photo': {
      const [file, ...caption] = args;
      if (!file) fail('Datei fehlt.');
      const form = new FormData();
      form.append('chat_id', needChat());
      if (caption.length) form.append('caption', caption.join(' '));
      form.append('photo', new Blob([readFileSync(file)]), basename(file));
      await api(token, 'sendPhoto', form);
      console.log('gesendet');
      break;
    }
    case 'ask': {
      const wait = waitArg(args);
      const [question, ...options] = args;
      if (!question) fail('Frage fehlt.');
      const chat = needChat();
      await poll(token); // alte Nachrichten überspringen, damit nur die neue Antwort zählt
      const sent = await api(token, 'sendMessage', {
        chat_id: chat,
        text: question,
        reply_markup: options.length
          ? {
              inline_keyboard: options.map((o, i) => [
                { text: o, callback_data: callbackData(o, i) },
              ]),
            }
          : undefined,
      });
      if (!wait) {
        console.log('Frage gesendet; Antwort später mit `inbox` abholen.');
        break;
      }
      const deadline = Date.now() + wait * 1000;
      while (Date.now() < deadline) {
        const left = Math.max(1, Math.min(50, Math.round((deadline - Date.now()) / 1000)));
        for (const u of await poll(token, left)) {
          const d = describe(u);
          if (!d || String(d.chat) !== String(chat)) continue;
          if (d.cb) d.text = `[Knopf] ${await acknowledge(token, d.cb)}`;
          else if (options.length) await closeQuestion(token, chat, sent.message_id, d.text);
          console.log(d.text);
          return;
        }
      }
      console.log('(keine Antwort innerhalb der Wartezeit)');
      break;
    }
    case 'inbox': {
      const chat = needChat();
      const wait = waitArg(args);
      const msgs = [];
      for (const u of await poll(token, wait)) {
        const d = describe(u);
        if (!d || String(d.chat) !== String(chat)) continue;
        if (d.cb) d.text = `[Knopf] ${await acknowledge(token, d.cb)}`;
        msgs.push(d.text);
      }
      console.log(msgs.length ? msgs.join('\n') : '(keine neuen Nachrichten)');
      break;
    }
    default:
      fail(
        'Befehle: setup | send <text> | photo <datei> [text] | ask <frage> <optionen…> [--wait s] | inbox [--wait s]',
      );
  }
}

main();
