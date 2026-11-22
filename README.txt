Telegram Messages for Homey

This app displays recent messages from a Telegram chat in a Homey dashboard widget. Choose to show 5, 10, or 20 messages and whether to show the sender. First add a Telegram Chat device, then select that device in the widget settings.

SETUP

1. Get a Telegram API ID and API hash:
   a. Open https://my.telegram.org in a browser and sign in with the Telegram account that can access the chat.
   b. Enter the verification code Telegram sends to your account.
   c. Open API development tools. If asked, complete the form to create an API application.
   d. Copy the API ID (a number) and API hash (32 characters).
   These are not your phone number, Telegram sign-in code, or two-step verification password.

2. Add a Telegram Chat device:
   a. In the Homey app, open Devices and tap + or Add device.
   b. Search for Telegram Messages and select Telegram Chat.
   c. Read the instructions, then continue to the API credential screen.
   d. Enter the API ID and API hash from API development tools.
   e. Enter the API ID and API hash, then tap Continue.
   f. On a logged-in Telegram app, open Settings → Devices → Link Desktop Device, scan the QR code shown by Homey, and approve the sign-in.
   g. If prompted, enter your Telegram two-step verification password in Homey.
   h. Select the chat to display and finish adding the device.

3. Add the dashboard widget:
   a. Open Home in the Homey app and edit the dashboard.
   b. Add the Telegram Messages widget.
   c. Open its settings and select the Telegram Chat device you added.
   d. Choose how many messages to show and whether to show the sender.
   e. Save the dashboard. The widget refreshes about every 30 seconds while visible.

To display a different chat, add another Telegram Chat device and select it in another widget.

PRIVACY

Homey stores the Telegram user session with the selected chat device. The app fetches messages directly from Telegram and sends only the selected chat's title, message text, sender names, and timestamps to the widget. Anyone who can view the dashboard can see the displayed messages.

To revoke a session, terminate it under Settings → Devices in Telegram and remove the Telegram Chat device from Homey.
