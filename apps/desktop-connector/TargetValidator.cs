using System.Net;
using System.Net.Sockets;

namespace SuiteMind.Connector;

internal static class TargetValidator
{
  internal static async Task<Uri> ValidateAsync(string? value)
  {
    if (!Uri.TryCreate(value, UriKind.Absolute, out var target))
    {
      throw new InvalidOperationException("Missing or invalid target provider URL.");
    }

    if (!string.Equals(target.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
    {
      throw new InvalidOperationException("The target provider URL must use HTTPS.");
    }

    if (!string.IsNullOrEmpty(target.UserInfo))
    {
      throw new InvalidOperationException("Provider URLs must not contain credentials.");
    }

    if (!target.AbsolutePath.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase) &&
        !target.AbsolutePath.EndsWith("/responses", StringComparison.OrdinalIgnoreCase))
    {
      throw new InvalidOperationException(
          "Only OpenAI-compatible chat completions or OpenAI Responses endpoints are allowed.");
    }

    if (string.Equals(target.Host, "localhost", StringComparison.OrdinalIgnoreCase))
    {
      throw new InvalidOperationException("Local provider targets are not allowed.");
    }

    IPAddress[] addresses;

    try
    {
      addresses = await Dns.GetHostAddressesAsync(target.DnsSafeHost);
    }
    catch (SocketException)
    {
      throw new InvalidOperationException("The provider host could not be resolved.");
    }

    if (addresses.Length == 0 || addresses.Any(IsPrivateAddress))
    {
      throw new InvalidOperationException("Private-network provider targets are not allowed.");
    }

    return target;
  }

  private static bool IsPrivateAddress(IPAddress address)
  {
    if (IPAddress.IsLoopback(address) || address.IsIPv6LinkLocal || address.IsIPv6SiteLocal)
    {
      return true;
    }

    if (address.AddressFamily != AddressFamily.InterNetwork)
    {
      return false;
    }

    var bytes = address.GetAddressBytes();
    return bytes[0] == 10 ||
           bytes[0] == 127 ||
           (bytes[0] == 169 && bytes[1] == 254) ||
           (bytes[0] == 172 && bytes[1] is >= 16 and <= 31) ||
           (bytes[0] == 192 && bytes[1] == 168);
  }
}
