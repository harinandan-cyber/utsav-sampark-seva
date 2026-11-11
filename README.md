# ઉત્સવ સંપર્ક સેવા (Utsav Sampark Seva)

A mobile app for volunteers in the festival contact seva department. There are two ways to install it:

| | How it is installed | Phones |
|---|---|---|
| **Web app (PWA)** | Open the link in Chrome/Safari, then "Add to Home screen" | Android + iPhone |
| **Android APK** | Download the `.apk` file and install it | Android |

Both use the same code: everything in the `app/` folder.

## Three main jobs
1. **Contact list**: search, plus filters by status (બાકી / આવશે / ફરી ફોન કરવો / ફોન ન લાગ્યો / નહીં આવે).
2. **Calling and WhatsApp**: one tap to call, or to send the invitation message on WhatsApp.
3. **Recording replies**: save the status, how many people are coming, and a note. "સાચવો, આગળ" (save and next) moves to the next pending contact.

The app also has a progress screen, a report (by status and by area), a WhatsApp summary, a CSV download, and settings.

## Publishing on GitHub (one-time)
1. Create a new repository on GitHub and push this code to its `main` branch.
2. **Web app link:** Settings → Pages → Source: **GitHub Actions**. After the next push the link is
   `https://<username>.github.io/<repo>/`. Send it to volunteers on WhatsApp.
3. **APK:** every push to `main` runs the "Android APK" workflow. Download the APK from the Actions tab → the latest run → Artifacts.
   Push a tag (e.g. `git tag v1.0 && git push --tags`) to publish it as a Release with a permanent download link.
4. **(Recommended) Signing key:** without one, the APK is signed with a temporary debug key, so installing a new version means uninstalling the old one first (which deletes the data on that phone).
   Create one key once and add it as repository secrets:
   ```sh
   keytool -genkey -v -keystore release.keystore -alias sampark -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 release.keystore   # → ANDROID_KEYSTORE_BASE64
   ```
   Also add `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`sampark`) and `ANDROID_KEY_PASSWORD`. With these secrets the workflow also builds an `.aab` file for the Play Store.

## Building on your own computer
Requires Node 22+, Java 21 and Android Studio (Android SDK).
```sh
npm install
npm run apk        # → android/app/build/outputs/apk/debug/app-debug.apk
```
After changing anything in `app/`, run `npx cap sync android` again. When you change web files, bump `VERSION` in `app/sw.js` so phones fetch the new version.

## Data
Data is stored only on each phone (`localStorage`) and starts with 12 sample contacts. "નમૂના ડેટા ફરી લોડ કરો" in Settings resets everything to the sample data.
