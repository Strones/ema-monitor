const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');

const CONFIG = {
  url: 'https://www.ema.europa.eu/en/medicines/human/summaries-opinion/daraxonrasib',
  keyword: 'daraxonrasib',
  stateFile: './last_state.json',
};

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('Telegram bot token or chat ID is missing!');
    return;
  }

  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  
  await fetch(telegramUrl, {
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
  console.log(`Checking ${CONFIG.url} at ${new Date().toISOString()}`);
  
  let response;
  try {
    response = await fetch(CONFIG.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
  } catch (err) {
    console.error('Network request failed:', err);
    return;
  }
    
  if (!response.ok) {
    console.log(`HTTP error! status: ${response.status} (Page might not exist yet)`);
    return;
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const bodyText = $('body').text().toLowerCase();

  const found = bodyText.includes(CONFIG.keyword.toLowerCase());

  let lastState = { exists: false };
  if (fs.existsSync(CONFIG.stateFile)) {
    lastState = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
  }

  if (found && !lastState.exists) {
    console.log('TRIGGER: Keyword found for the first time!');
    await sendTelegramMessage(
      `🚨 *EMA Approval Alert: Daraxonrasib detected!*\n\nDaraxonrasib was detected on the EMA page:\n${CONFIG.url}`
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
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await res.json();
    if (!data.ok || !data.result) return;

    // Find the latest message from your chat
    const messages = data.result
      .filter(u => u.message && u.message.chat && u.message.chat.id.toString() === chatId.toString())
      .map(u => u.message);

    if (messages.length === 0) return;
    const latestMessage = messages[messages.length - 1];
    const text = (latestMessage.text || '').trim().toLowerCase();

    // Check message age (only respond to commands sent in the last 30 mins)
    const now = Math.floor(Date.now() / 1000);
    if (now - latestMessage.date > 1800) return;

    // Handle commands
    if (text === '/status' || text === 'status') {
      let lastState = { exists: false };
      if (fs.existsSync(CONFIG.stateFile)) {
        lastState = JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
      }
      await sendTelegramMessage(`🤖 *Monitor Status*\n- Target: Daraxonrasib\n- Detected on page: \`${lastState.exists}\`\n- URL: ${CONFIG.url}`);
    } else if (text === '/check' || text === 'check') {
      const found = $('body').text().toLowerCase().includes(CONFIG.keyword.toLowerCase());
      await sendTelegramMessage(`🔍 *Manual Check Result*\nDaraxonrasib mentioned on page right now: \`${found}\``);
    } else if (text === '/help' || text === 'help') {
      await sendTelegramMessage(`📋 *Available Commands*\n- /status : View current monitor state\n- /check : Perform instant check right now`);
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
