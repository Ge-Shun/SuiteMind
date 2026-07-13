using System.Net.Http.Headers;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace SuiteMind.Connector;

internal sealed class ConnectorServer : IAsyncDisposable
{
  private readonly IHost host;

  private ConnectorServer(IHost host)
  {
    this.host = host;
  }

  internal static async Task<ConnectorServer> StartAsync(
      X509Certificate2 certificate,
      CancellationToken cancellationToken)
  {
    var builder = WebApplication.CreateSlimBuilder();
    builder.Logging.ClearProviders();
    builder.WebHost.ConfigureKestrel(options =>
    {
      options.ListenLocalhost(ConnectorConstants.Port, listen =>
          {
            listen.UseHttps(certificate);
          });
      options.Limits.MaxRequestBodySize = ConnectorConstants.MaximumBodyBytes;
    });
    builder.Services.AddHttpClient("provider", client =>
    {
      client.Timeout = Timeout.InfiniteTimeSpan;
    }).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
      AllowAutoRedirect = false,
      UseCookies = false,
    });

    var app = builder.Build();
    app.Use(async (context, next) =>
    {
      ApplyCorsHeaders(context);

      if (!IsOriginAllowed(context.Request.Headers.Origin.ToString()))
      {
        await WriteErrorAsync(context, StatusCodes.Status403Forbidden,
                "This origin is not allowed to use SuiteMind Connector.");
        return;
      }

      if (HttpMethods.IsOptions(context.Request.Method))
      {
        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
      }

      await next();
    });

    app.MapGet(ConnectorConstants.HealthPath, () => Results.Json(new
    {
      status = "ready",
      product = ConnectorConstants.ProductName,
      version = typeof(ConnectorServer).Assembly.GetName().Version?.ToString(),
    }));
    app.MapPost(ConnectorConstants.ProxyPath, ProxyProviderRequestAsync);

    await app.StartAsync(cancellationToken);
    return new ConnectorServer(app);
  }

  private static bool IsOriginAllowed(string origin)
  {
    return string.IsNullOrEmpty(origin) || ConnectorConstants.AllowedOrigins.Contains(origin);
  }

  private static void ApplyCorsHeaders(HttpContext context)
  {
    var origin = context.Request.Headers.Origin.ToString();
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers.Vary = "Origin";
    context.Response.Headers.AccessControlAllowMethods = "GET, POST, OPTIONS";
    context.Response.Headers.AccessControlAllowHeaders =
        "Accept, Authorization, Content-Type, X-SuiteMind-Target-Url";
    context.Response.Headers["Access-Control-Allow-Private-Network"] = "true";

    if (ConnectorConstants.AllowedOrigins.Contains(origin))
    {
      context.Response.Headers.AccessControlAllowOrigin = origin;
    }
  }

  private static async Task ProxyProviderRequestAsync(HttpContext context)
  {
    Uri target;

    try
    {
      target = await TargetValidator.ValidateAsync(
          context.Request.Headers["X-SuiteMind-Target-Url"].ToString());
    }
    catch (InvalidOperationException error)
    {
      await WriteErrorAsync(context, StatusCodes.Status400BadRequest, error.Message);
      return;
    }

    if (context.Request.ContentLength > ConnectorConstants.MaximumBodyBytes)
    {
      await WriteErrorAsync(context, StatusCodes.Status413PayloadTooLarge,
          "Request body is too large.");
      return;
    }

    using var request = new HttpRequestMessage(HttpMethod.Post, target);
    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue(
        context.Request.Headers.Accept.FirstOrDefault() ?? "text/event-stream"));

    var authorization = context.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(authorization))
    {
      request.Headers.TryAddWithoutValidation("Authorization", authorization);
    }

    request.Content = new StreamContent(context.Request.Body);
    request.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(
        context.Request.ContentType ?? "application/json");

    try
    {
      var client = context.RequestServices.GetRequiredService<IHttpClientFactory>()
          .CreateClient("provider");
      using var response = await client.SendAsync(
          request,
          HttpCompletionOption.ResponseHeadersRead,
          context.RequestAborted);

      context.Response.StatusCode = (int)response.StatusCode;
      context.Response.ContentType =
          response.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
      await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
      // The Word task pane cancelled the request.
    }
    catch (HttpRequestException error)
    {
      if (!context.Response.HasStarted)
      {
        await WriteErrorAsync(context, StatusCodes.Status502BadGateway,
            $"SuiteMind Connector could not reach the provider: {error.Message}");
      }
    }
  }

  private static async Task WriteErrorAsync(HttpContext context, int status, string message)
  {
    context.Response.StatusCode = status;
    context.Response.ContentType = "application/json; charset=utf-8";
    await context.Response.WriteAsJsonAsync(new { error = new { message } });
  }

  public async ValueTask DisposeAsync()
  {
    await host.StopAsync(TimeSpan.FromSeconds(5));
    host.Dispose();
  }
}
