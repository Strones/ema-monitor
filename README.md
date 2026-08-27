# EMA Monitor

Monitors the EMA page for **daraxonrasib** and sends an email notification automatically using GitHub Actions.

## Setup Instructions

1. Create a **Private Repository** on GitHub (e.g., `ema-monitor`).
2. Push this folder's contents to your repository:
   ```bash
   git init
   git add .
   git commit -m "Initial setup"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ema-monitor.git
   git push -u origin main
   ```
3. Go to your repository **Settings > Secrets and variables > Actions** and add the following secrets:
   - `SMTP_HOST`: `smtp.gmail.com` (or your email provider SMTP)
   - `SMTP_PORT`: `465`
   - `SMTP_USER`: Your email address
   - `SMTP_PASS`: Your email App Password
   - `TO_EMAIL`: The recipient email address
4. Go to the **Actions** tab in your repository, select **EMA Monitor**, and click **Run workflow** to test it out!
