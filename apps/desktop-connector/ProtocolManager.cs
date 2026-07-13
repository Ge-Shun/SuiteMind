using Microsoft.Win32;

namespace SuiteMind.Connector;

internal static class ProtocolManager
{
  private const string ProtocolKeyPath = @"Software\Classes\suitemind";

  internal static void Register()
  {
    using var protocolKey = Registry.CurrentUser.CreateSubKey(ProtocolKeyPath);
    protocolKey.SetValue(null, "URL:SuiteMind Connector Protocol");
    protocolKey.SetValue("URL Protocol", string.Empty);

    using var commandKey = protocolKey.CreateSubKey(@"shell\open\command");
    commandKey.SetValue(null, $"\"{Environment.ProcessPath}\" \"%1\"");
  }
}
