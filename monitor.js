const fetch = require('node-fetch');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const fs = require('fs');

const CONFIG = {
  url: 'https://www.ema.europa.eu/en/medicines/human/summaries-opinion/daraxonrasib',
  keyword: 'daraxonrasib',
  stateFile: './last_state.json',
};

async function sendEmail(subject, text) {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: `"EMA Monitor" <${process.env.SMTP_USER}>`,
    to: process.env.TO_EMAIL,
    subject: subject,
    text: text
  });
  console.log('Alert email sent successfully!');
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
    await sendEmail(
      '🚨 EMA Approval Alert: Daraxonrasib detected!',
      `Daraxonrasib was detected on the EMA page:\n\n${CONFIG.url}`
    );
  } else {
    console.log('No new status change detected.');
  }

  fs.writeFileSync(CONFIG.stateFile, JSON.stringify({ exists: found }, null, 2));
}

checkEMA();
