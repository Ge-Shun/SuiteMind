# Install SuiteMind for Word

SuiteMind's production add-in is hosted on GitHub Pages. End users do not need
Node.js, PowerShell, the source repository, or `npm run dev`.

## Download

Open the production installation page:

```text
https://ge-shun.github.io/SuiteMind/install.html
```

Select **Download production manifest**. The downloaded file should be named
`SuiteMind-manifest.xml`.

The manifest is also available directly at:

```text
https://ge-shun.github.io/SuiteMind/manifest.xml
```

Do not distribute `apps/word-addin/manifest.xml`; that file is the development
manifest and loads the task pane from `https://localhost:3000`.

## Install In Word

The simplest self-service installation path is Word for the web:

1. Open Word for the web and create or open a document.
2. Select **Insert -> Add-ins -> More Add-ins**.
3. Open **My Add-ins** and select **Upload My Add-in**.
4. Select `SuiteMind-manifest.xml` and confirm the upload.
5. Open SuiteMind from **My Add-ins**.

Microsoft changes the exact menu labels occasionally. If **Upload My Add-in**
is unavailable, the Microsoft 365 administrator must deploy the manifest
through the organization's integrated apps or centralized deployment flow.

## Configure A Provider

After SuiteMind opens:

1. Open **Model settings**.
2. Choose a provider.
3. Enter the API base URL, API key, and model.
4. Select **Test connection** before using Ask or Edit.

The API key remains only in the current task pane session. Closing or reloading
the pane clears it.

## Replace A Development Sideload

If Word displays `localhost`, a debugger prompt, an old icon, or **We couldn't
start this add-in**, a development sideload is probably still registered:

1. Close all Word windows.
2. Remove the old SuiteMind entry from **My Add-ins** when it is visible there.
3. Reopen Word and upload the production manifest from the installation page.
4. If the old icon remains, restart Word once more so Office can refresh its
   add-in cache.

The production manifest loads SuiteMind from GitHub Pages and never requires
`npm run dev`.

## Remove SuiteMind

Open **My Add-ins**, find SuiteMind, open its menu, and select **Remove**. In a
managed Microsoft 365 tenant, contact the administrator if the add-in was
centrally deployed.

## Connection Limitations

Installation and model connectivity are separate. Some providers block direct
requests from Office webviews through CORS. The add-in can use the optional
localhost proxy for supported providers, as described in
[`deployment.md`](deployment.md#cors-limitation).

### Windows Connector

When direct access is blocked, download the optional Windows connector from the
installation page. Extract the ZIP and run `SuiteMindConnector.exe`.

The current connector is not code-signed. Windows SmartScreen may display
**Windows protected your PC** and **Unknown publisher**. This warning does not
prevent the connector from working. Before choosing **More info -> Run anyway**:

1. Download only from `https://ge-shun.github.io/SuiteMind/` or the repository's
   GitHub Releases page.
2. Download the adjacent `.sha256` file and compare it with:

   ```powershell
   Get-FileHash .\SuiteMind-Connector-win-x64.zip -Algorithm SHA256
   ```

3. Stop if the hashes differ or Microsoft Defender reports malware, an invalid
   signature, or a damaged file.

A checksum confirms that the download matches the file published by this
repository. It does not provide the publisher identity guarantee of a publicly
trusted Authenticode certificate.

On first launch, the connector:

- copies itself to `%LOCALAPPDATA%\SuiteMind\Connector\App` so it does not depend
  on the Downloads folder;
- creates and trusts a certificate for `https://localhost:3001` in the current
  Windows user profile;
- registers the `suitemind://` protocol so the Word task pane can start it;
- starts a tray application that forwards only supported provider endpoints;
- accepts requests only from the SuiteMind production origin and local
  development origins;
- does not persist API keys, document text, requests, or responses.
- enables **Start with Windows** by default; the user can disable it from the
  tray menu.

Use the tray menu to enable **Start with Windows**, check status, or exit the
connector. See [`connector-security.md`](connector-security.md) for the security
boundary.

## GitHub Releases

Versioned releases are published at:

```text
https://github.com/Ge-Shun/SuiteMind/releases
```

Each release includes the production manifest, a versioned Windows connector
ZIP, its `.sha256` file, and `SHA256SUMS.txt`. Release notes state explicitly
whether the connector has an Authenticode signature.
