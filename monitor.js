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
  
  const response = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      disable_web_page_preview: false
    })
  });

  const data = await response.json();
  if (data.ok) {
    console.log('Telegram alert sent successfully!');
  } else {
    console.error('Failed to send Telegram message:', data);
  }
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

checkEMA();
