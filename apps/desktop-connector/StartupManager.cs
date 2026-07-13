using Microsoft.Win32;

namespace SuiteMind.Connector;

internal static class StartupManager
{
  private const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
  private const string ValueName = "SuiteMindConnector";
  private const string SettingsKeyPath = @"Software\SuiteMind\Connector";
  private const string AutoStartConfiguredValue = "AutoStartConfigured";

  internal static void EnsureDefaultEnabled()
  {
    using var settings = Registry.CurrentUser.CreateSubKey(SettingsKeyPath);

    if (settings.GetValue(AutoStartConfiguredValue) is null)
    {
      SetEnabled(true);
    }
  }

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

    using var settings = Registry.CurrentUser.CreateSubKey(SettingsKeyPath);
    settings.SetValue(AutoStartConfiguredValue, 1, RegistryValueKind.DWord);
  }
}
