# EMA Telegram Monitor

Monitors the EMA page for **daraxonrasib** and sends an instant notification to your **Telegram** via GitHub Actions.

## Setup Instructions

### 1. Create a Telegram Bot
1. Message **`@BotFather`** on Telegram and send `/newbot`.
2. Follow the prompts to name your bot and get your **Bot Token**.
3. Start a chat with your new bot and send any message to it.
4. Get your Telegram Chat ID by visiting: 
   `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` (look for `"chat":{"id":XXXXXXXXX,...}`).

### 2. Configure GitHub Secrets
1. Create a private repository on GitHub named `ema-monitor`.
2. Push this code:
   ```bash
   cd /home/maker/ema-github-monitor
   git init
   git add .
   git commit -m "Switch to Telegram monitor"
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/ema-monitor.git
   git push -u origin main
   ```
3. Go to your repository **Settings > Secrets and variables > Actions** and add two secrets:
   - `TELEGRAM_BOT_TOKEN`: Your bot token from BotFather
   - `TELEGRAM_CHAT_ID`: Your chat ID
4. Go to the **Actions** tab, select **EMA Monitor**, and click **Run workflow** to test!
