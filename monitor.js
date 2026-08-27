const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const CONFIG = {
  // Using DuckDuckGo HTML search API as a reliable proxy to monitor EMA for daraxonrasib without hitting EMA bot-blocks or strict search parameter routing
  url: 'https://html.duckduckgo.com/html/?q=site:ema.europa.eu+daraxonrasib',
  keyword: 'daraxonrasib',
  stateFile: './last_state.json',
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
      disable_web_page_preview: false
    })
  });
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

async function handleCommands() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    // Note: getUpdates clears old messages unless offset is managed, 
    // but to keep it simple we fetch the latest updates.
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?allowed_updates=["message"]`);
    const data = await res.json();
    if (!data.ok || !data.result) return;

    for (const update of data.result) {
      if (!update.message || !update.message.text) continue;
      const msgChatId = update.message.chat.id.toString();
      if (msgChatId !== chatId.toString()) continue;

      const text = update.message.text.trim().toLowerCase();
      const now = Math.floor(Date.now() / 1000);
      
      // Ignore messages older than 1 hour
      if (now - update.message.date > 3600) continue;

      if (text === '/status' || text === 'status') {
        let lastState = { exists: false };
        if (fs.existsSync(CONFIG.stateFile)) {
          lastState = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
        }
        await sendTelegramMessage(`🤖 *Monitor Status*\n- Target: Daraxonrasib\n- Detected in index: \`${lastState.exists}\``);
      } else if (text === '/check' || text === 'check') {
        const html = await (await fetch(CONFIG.url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
        const found = html.toLowerCase().includes(CONFIG.keyword.toLowerCase());
        await sendTelegramMessage(`🔍 *Manual Check Result*\nDaraxonrasib in search index right now: \`${found}\``);
      } else if (text === '/help' || text === 'help') {
        await sendTelegramMessage(`📋 *Available Commands*\n- /status : View current monitor state\n- /check : Perform instant check right now`);
      }
    }
  } catch (err) {
    console.error('Error handling commands:', err);
  }
}

async function run() {
  await handleCommands();
  await checkEMA();
}

run();
