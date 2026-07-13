using System.Diagnostics;
using System.Drawing;

namespace SuiteMind.Connector;

internal sealed class ConnectorApplicationContext : ApplicationContext
{
  private readonly CancellationTokenSource cancellation = new();
  private readonly NotifyIcon notifyIcon;
  private readonly ToolStripMenuItem startupMenuItem;
  private ConnectorServer? server;

  internal ConnectorApplicationContext()
  {
    StartupManager.EnsureDefaultEnabled();
    startupMenuItem = new ToolStripMenuItem("Start with Windows")
    {
      Checked = StartupManager.IsEnabled,
      CheckOnClick = true,
    };
    startupMenuItem.CheckedChanged += (_, _) =>
        StartupManager.SetEnabled(startupMenuItem.Checked);

    var menu = new ContextMenuStrip();
    menu.Items.Add("Status", null, (_, _) => ShowStatus());
    menu.Items.Add(startupMenuItem);
    menu.Items.Add("Open installation page", null, (_, _) => OpenInstallationPage());
    menu.Items.Add(new ToolStripSeparator());
    menu.Items.Add("Exit", null, async (_, _) => await ExitAsync());

    notifyIcon = new NotifyIcon
    {
      Icon = LoadTrayIcon(),
      Text = "SuiteMind Connector is starting",
      ContextMenuStrip = menu,
      Visible = true,
    };
    notifyIcon.DoubleClick += (_, _) => ShowStatus();

    _ = StartServerAsync();
  }

  private async Task StartServerAsync()
  {
    try
    {
      ProtocolManager.Register();
      var certificate = CertificateManager.EnsureCertificate();
      server = await ConnectorServer.StartAsync(certificate, cancellation.Token);
      notifyIcon.Text = "SuiteMind Connector is ready";
      notifyIcon.ShowBalloonTip(
          2500,
          ConnectorConstants.ProductName,
          "Ready for Word connections.",
          ToolTipIcon.Info);
    }

    catch (Exception error)
    {
      notifyIcon.Text = "SuiteMind Connector failed to start";
      MessageBox.Show(
          $"SuiteMind Connector could not start.\n\n{error.Message}",
          ConnectorConstants.ProductName,
          MessageBoxButtons.OK,
          MessageBoxIcon.Error);
    }
  }

  private static Icon LoadTrayIcon()
  {
    var stream = typeof(ConnectorApplicationContext).Assembly.GetManifestResourceStream(
        "SuiteMind.Connector.Assets.SuiteMind.ico");
    return stream is null ? SystemIcons.Application : new Icon(stream);
  }

  private void ShowStatus()
  {
    var message = server is null
        ? "The local connector is not running."
        : $"The local connector is ready.\n\nhttps://localhost:{ConnectorConstants.Port}";
    MessageBox.Show(
        message,
        ConnectorConstants.ProductName,
        MessageBoxButtons.OK,
        server is null ? MessageBoxIcon.Warning : MessageBoxIcon.Information);
  }

  private static void OpenInstallationPage()
  {
    Process.Start(new ProcessStartInfo
    {
      FileName = "https://ge-shun.github.io/SuiteMind/install.html",
      UseShellExecute = true,
    });
  }

  private async Task ExitAsync()
  {
    cancellation.Cancel();

    if (server is not null)
    {
      await server.DisposeAsync();
    }

    notifyIcon.Visible = false;
    notifyIcon.Dispose();
    ExitThread();
  }

  protected override void Dispose(bool disposing)
  {
    if (disposing)
    {
      cancellation.Dispose();
      notifyIcon.Dispose();
    }

    base.Dispose(disposing);
  }
}
