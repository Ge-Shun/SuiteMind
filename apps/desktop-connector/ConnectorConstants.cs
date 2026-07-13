namespace SuiteMind.Connector;

internal static class ConnectorConstants
{
  internal const int Port = 3001;
  internal const string ProductName = "SuiteMind Connector";
  internal const string ProxyPath = "/api/provider/chat/completions";
  internal const string HealthPath = "/health";
  internal const string ProductionOrigin = "https://ge-shun.github.io";
  internal const int MaximumBodyBytes = 2 * 1024 * 1024;

  internal static readonly HashSet<string> AllowedOrigins = new(StringComparer.OrdinalIgnoreCase)
    {
        ProductionOrigin,
        "https://localhost:3000",
        "https://127.0.0.1:3000",
    };
}
