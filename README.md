# Google Play Sales for Homey

This local Homey app adds a **Google Play Sales** dashboard widget that reads
the five latest incoming text messages from your existing Telegram sales bot.
It refreshes about every 30 seconds while visible. The Supabase purchase
webhook continues to send directly to Telegram.

## Install and connect

1. In this directory on your Mac Mini, run `npm ci`.
2. Run `homey login` and `homey select`, then choose your **Homey Self-Hosted
   Server**. Run `homey app install`.
3. Sign in to [Telegram’s developer portal](https://my.telegram.org) with
   the Telegram user account that receives the sales alerts. In **API
   development tools**, find or create your API ID and API hash.
4. Run `npm run telegram-login` in this directory on the Mac. Enter the API ID,
   API hash, your sales bot’s username (the handle shown in its Telegram
   profile), and your personal Telegram sign-in details when prompted.
   The script copies the connection to the Mac clipboard.
5. In Homey, open **Apps → Google Play Sales → Settings**. Paste the
   connection into **Telegram connection** and click **Save connection**.
   Clear the clipboard afterwards.
6. Edit your Homey dashboard, add the **Google Play Sales** widget, and
   check it displays the existing chat history.

The connection includes a Telegram user session and should be kept private.
Homey stores it in this app’s settings. The widget receives only the selected
chat’s message text and timestamps. To revoke the login, terminate the session
under **Settings → Devices** in Telegram and remove the connection in Homey.
