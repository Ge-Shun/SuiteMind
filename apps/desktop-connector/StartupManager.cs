using Microsoft.Win32;

namespace SuiteMind.Connector;

internal static class StartupManager
{
  private const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
  private const string ValueName = "SuiteMindConnector";

  internal static bool IsEnabled
  {
    get
    {
      using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath);
      return key?.GetValue(ValueName) is string;
    }
  }

  internal static void SetEnabled(bool enabled)
  {
    using var key = Registry.CurrentUser.CreateSubKey(RunKeyPath);

    if (enabled)
    {
      key.SetValue(ValueName, $"\"{Environment.ProcessPath}\" --background");
    }
    else
    {
      key.DeleteValue(ValueName, false);
    }
  }
}
