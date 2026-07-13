using System.Threading;

namespace SuiteMind.Connector;

internal static class Program
{
  private const string MutexName = "SuiteMind.Connector.Singleton";

  [STAThread]
  private static void Main()
  {
    using var mutex = new Mutex(true, MutexName, out var isFirstInstance);

    if (!isFirstInstance)
    {
      return;
    }

    ApplicationConfiguration.Initialize();
    Application.Run(new ConnectorApplicationContext());
  }
}
