using System.Diagnostics;

namespace SuiteMind.Connector;

internal static class InstallationManager
{
  internal static string InstallDirectory => Path.Combine(
      Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
      "SuiteMind",
      "Connector",
      "App");

  internal static string InstalledExecutablePath => Path.Combine(
      InstallDirectory,
      "SuiteMindConnector.exe");

  internal static bool EnsureInstalled()
  {
    var currentPath = Environment.ProcessPath;

    if (string.IsNullOrWhiteSpace(currentPath))
    {
      throw new InvalidOperationException("The connector executable path is unavailable.");
    }

    if (string.Equals(
        Path.GetFullPath(currentPath),
        Path.GetFullPath(InstalledExecutablePath),
        StringComparison.OrdinalIgnoreCase))
    {
      return true;
    }

    Directory.CreateDirectory(InstallDirectory);
    File.Copy(currentPath, InstalledExecutablePath, true);
    Process.Start(new ProcessStartInfo
    {
      FileName = InstalledExecutablePath,
      Arguments = "--background",
      UseShellExecute = true,
    });
    return false;
  }
}
