const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const CONFIG = {
  url: 'https://html.duckduckgo.com/html/?q=site:ema.europa.eu+daraxonrasib',
  keyword: 'daraxonrasib',
  stateFile: './last_state.json',
  offsetFile: './last_update_id.json'
};

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    })
  });
}

async function handleCommands() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  let lastUpdateId = 0;
  if (fs.existsSync(CONFIG.offsetFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG.offsetFile, 'utf8'));
      lastUpdateId = data.offset || 0;
    } catch (e) {}
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=1`);
    const data = await res.json();
    if (!data.ok || !data.result || data.result.length === 0) return;

    for (const update of data.result) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id);

      if (!update.message || !update.message.text) continue;
      const msgChatId = update.message.chat.id.toString();
      if (msgChatId !== chatId.toString()) continue;

      const text = update.message.text.trim().toLowerCase();
      console.log(`Received command: ${text}`);

      if (text === '/status' || text === 'status') {
        let lastState = { exists: false };
        if (fs.existsSync(CONFIG.stateFile)) {
          lastState = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
        }
        await sendTelegramMessage(`🤖 *Monitor Status*\n- Target: Daraxonrasib\n- Detected in index: \`${lastState.exists}\``);
      } else if (text === '/check' || text === 'check') {
        const response = await fetch(CONFIG.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await response.text();
        const found = html.toLowerCase().includes(CONFIG.keyword.toLowerCase());
        await sendTelegramMessage(`🔍 *Manual Check Result*\nDaraxonrasib in search index right now: \`${found}\``);
      } else if (text === '/help' || text === 'help' || text === '/start') {
        await sendTelegramMessage(`📋 *Available Commands*\n- /status : View current monitor state\n- /check : Perform instant check right now`);
      }
    }

    fs.writeFileSync(CONFIG.offsetFile, JSON.stringify({ offset: lastUpdateId }, null, 2));
  } catch (err) {
    console.error('Error handling commands:', err);
  }
}

async function checkEMA() {
  console.log(`Checking search index for ${CONFIG.keyword} at ${new Date().toISOString()}`);
  
  let response;
  try {
    response = await fetch(CONFIG.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
  } catch (err) {
    console.error('Network request failed:', err);
    return;
  }
    
  if (!response.ok) {
    console.log(`HTTP error! status: ${response.status}`);
    return;
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const bodyText = $('body').text().toLowerCase();

  const found = bodyText.includes(CONFIG.keyword.toLowerCase()) && !bodyText.includes('no results');

  let lastState = { exists: false };
  if (fs.existsSync(CONFIG.stateFile)) {
    lastState = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
  }

  if (found && !lastState.exists) {
    console.log('TRIGGER: Keyword found in search index!');
    await sendTelegramMessage(
      `🚨 *EMA Approval Alert: Daraxonrasib detected!*\n\nDaraxonrasib appeared in EMA search indices:\nhttps://www.ema.europa.eu/en/medicines/human/summaries-opinion/daraxonrasib`
    );
  } else {
    console.log('No new status change detected.');
  }

  fs.writeFileSync(CONFIG.stateFile, JSON.stringify({ exists: found }, null, 2));
}

async function run() {
  await handleCommands();
  await checkEMA();
}

run();
