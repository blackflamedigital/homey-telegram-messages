# Telegram Messages

**Telegram Messages** adds a Homey dashboard widget for the latest five
messages from one Telegram chat. Choose a direct chat, group, channel, or Saved
Messages. The widget shows both incoming and outgoing messages, newest first,
and refreshes about every 30 seconds while visible. It shows a short label for
messages without text.

## Install and connect

1. Run `npm ci` in this directory.
2. Run `homey login` and `homey select`, choose your Homey, then run
   `homey app install`. Skip this step when installing from the Homey App Store.
3. Sign in at [my.telegram.org](https://my.telegram.org) using the Telegram
   account that has access to the chat. In **API development tools**, find or
   create your API ID and API hash.
4. Run `npm run telegram-login`. Enter the API ID and hash, sign in when
   prompted, then filter the chat list or press Enter to list all chats. Choose
   the number next to the chat you want to display.
5. Open **Apps → Telegram Messages → Settings** in Homey. Paste the connection
   into **Telegram connection** and click **Save connection**. On macOS the
   script copies the connection to the clipboard. On other systems it prints
   the connection for you to copy.
6. Edit your Homey dashboard and add the **Telegram Messages** widget.

Run the sign-in script again and save the new connection to switch chats.

## Privacy

The connection includes a Telegram user session. Keep it private and clear it
from your clipboard or terminal after setup. Homey stores it in the app’s
settings. The app uses it to fetch messages directly from Telegram and sends
only the selected chat’s title, message text, and timestamps to the widget.
Anyone who can view the dashboard can see the displayed messages.

To revoke a session, terminate it under **Settings → Devices** in Telegram
and remove the connection in Homey.

## App Store validation

Run `homey app validate --level publish` before submitting a draft for review.
[Homey’s publishing guide](https://apps.developer.homey.app/app-store/publishing)
