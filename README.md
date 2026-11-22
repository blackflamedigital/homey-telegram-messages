# Telegram Messages

**Telegram Messages** adds a Homey dashboard widget for recent messages from a
Telegram chat. Add a Telegram chat from Homey's **Add device** flow, then select
it in the widget settings. Choose to show 5, 10, or 20 messages and whether to
show the sender. Messages appear newest first. The widget refreshes about every
30 seconds while visible and shows a short label for messages without text.

## Set up the widget

### Get Telegram API credentials

1. In a browser, open [my.telegram.org](https://my.telegram.org) and sign in
   with the Telegram account that can access the chat you want to display.
2. Enter the verification code Telegram sends to your account.
3. Open **API development tools**.
4. If you have not created an API application before, complete Telegram's form
   to create one.
5. Copy the **API ID** (a number) and **API hash** (a 32-character value).
   These are different from your phone number, Telegram login code, and
   two-step verification password.

### Add the Telegram chat to Homey

1. Open the Homey app and go to **Devices**.
2. Tap **+** or **Add device**.
3. Search for and select **Telegram Messages**.
4. Choose **Telegram Chat** and start connecting.
5. On the **Before you connect** screen, follow the link to `my.telegram.org`
   if you still need your API ID and API hash, then tap **Continue**.
6. Enter the API ID and API hash from **API development tools**, then tap
   **Continue**.
7. In Telegram on a logged-in device, open **Settings → Devices → Link Desktop
   Device**, scan the QR code shown by Homey, and approve the sign-in.
8. If Telegram asks for your two-step verification password, enter it in Homey.
9. Select the chat you want to show and finish adding the device.

### Add the dashboard widget

1. Open **Home** in the Homey app and edit the dashboard where you want the
   messages to appear.
2. Add the **Telegram Messages** widget.
3. Open the widget's settings and select the **Telegram Chat** device you just
   added.
4. Choose how many messages to show and whether to show the sender.
5. Save the dashboard. The widget refreshes about every 30 seconds while visible.

Add another Telegram Chat device to show a different chat.

## Privacy

Homey stores a Telegram user session with the selected chat device. The app
uses it to fetch messages directly from Telegram and sends only the selected
chat’s title, message text, sender names, and timestamps to the widget.
Anyone who can view the dashboard can see the displayed messages.

To revoke a session, terminate it under **Settings → Devices** in Telegram and
remove the Telegram Chat device from Homey.

## App Store validation

Run `homey app validate --level publish` before submitting a draft for review.
[Homey’s publishing guide](https://apps.developer.homey.app/app-store/publishing)
