# Sage & Pips for Android

A small virtual-companion app starring your ChatGPT pets Sage (the fluffy brown tabby) and Pips (the smoky grey cat). The app uses their original sprite sheet, stores care meters locally on the device, and offers Feed, Play, and Rest actions.

## Open and build

1. Install Android Studio with Android SDK Platform 35 and JDK 17.
2. Open this `SageAndPipsAndroid` folder in Android Studio.
3. Let Gradle sync, then choose **Run** to launch on an emulator or connected Android device.

Application ID: `com.sageandpips`  
Minimum Android version: Android 8.0 (API 26)

The care values are a lightweight prototype and persist on the device. They do not decay over time and there is no account or network connection.

## Build an APK with GitHub Actions

This project includes `.github/workflows/build-apk.yml`. GitHub will build a debug APK whenever you push to `main`, open a pull request into `main`, or run the workflow manually.

### Upload through the GitHub website (no desktop app needed)

1. Download and unzip this project. Open the extracted `SageAndPipsAndroid` folder. Its contents include `app`, `.github`, `settings.gradle.kts`, and the Gradle build files.
2. On GitHub, create a new empty repository. Leave the options to add a README, `.gitignore`, or license unchecked so the repository starts empty.
3. In the new repository, choose **Add file → Upload files**. In File Explorer, open the extracted `SageAndPipsAndroid` folder, select all of its contents, and drag them onto the GitHub upload page. Upload the contents, not an extra enclosing `SageAndPipsAndroid` folder. Make sure the `.github` folder is included.
4. At the bottom of the page, enter a commit message such as `Add Sage and Pips Android app` and select **Commit directly to the main branch**.
5. Open **Actions** in the repository. The `Build Sage & Pips APK` workflow should start after the commit. When its run completes successfully, open the run summary and download the `SageAndPips-debug-apk` artifact.
6. Unzip the downloaded artifact to get `app-debug.apk`.

GitHub's browser uploader accepts dragged files and folders and limits each uploaded file to 25 MiB. The pet sprite sheet is below that limit.

### Upload with GitHub Desktop

1. Install GitHub Desktop, sign in, and choose **File → Add local repository**. Select the `SageAndPipsAndroid` folder. If it is not a Git repository yet, choose the option to create one there.
2. Commit the files, then choose **Publish repository**. A private repository is fine; GitHub Actions works with it.
3. On GitHub, open the repository’s **Actions** tab. Select **Build Sage & Pips APK** and open the latest run. The automatic build starts after the first push to `main`; you can also choose **Run workflow**.
4. When the run finishes successfully, download the `SageAndPips-debug-apk` artifact from the run summary and unzip it. The APK inside is `app-debug.apk`.

This workflow builds a debug APK for direct installation. It does not publish to Google Play or create a Play Store release bundle.
