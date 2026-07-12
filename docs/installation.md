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
