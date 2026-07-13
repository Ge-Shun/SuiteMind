using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace SuiteMind.Connector;

internal static class CertificateManager
{
  private const string CertificateSubject = "CN=SuiteMind Local Connector";
  private const string CertificateFileName = "connector-certificate.pfx";

  internal static X509Certificate2 EnsureCertificate()
  {
    var appDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "SuiteMind",
        "Connector");
    Directory.CreateDirectory(appDirectory);

    var certificatePath = Path.Combine(appDirectory, CertificateFileName);
    var certificate = LoadCertificate(certificatePath);

    if (certificate is null || certificate.NotAfter <= DateTimeOffset.UtcNow.AddDays(30))
    {
      certificate?.Dispose();
      certificate = CreateCertificate();
      File.WriteAllBytes(certificatePath, certificate.Export(X509ContentType.Pfx));
    }

    TrustCertificate(certificate);
    return certificate;
  }

  private static X509Certificate2? LoadCertificate(string path)
  {
    if (!File.Exists(path))
    {
      return null;
    }

    try
    {
      return new X509Certificate2(
          path,
          (string?)null,
          X509KeyStorageFlags.Exportable | X509KeyStorageFlags.PersistKeySet);
    }
    catch (CryptographicException)
    {
      return null;
    }
  }

  private static X509Certificate2 CreateCertificate()
  {
    using var rsa = RSA.Create(2048);
    var request = new CertificateRequest(
        CertificateSubject,
        rsa,
        HashAlgorithmName.SHA256,
        RSASignaturePadding.Pkcs1);

    request.CertificateExtensions.Add(
        new X509BasicConstraintsExtension(false, false, 0, true));
    request.CertificateExtensions.Add(
        new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature, true));
    request.CertificateExtensions.Add(
        new X509EnhancedKeyUsageExtension(
            new OidCollection { new("1.3.6.1.5.5.7.3.1") },
            true));

    var subjectAlternativeName = new SubjectAlternativeNameBuilder();
    subjectAlternativeName.AddDnsName("localhost");
    subjectAlternativeName.AddIpAddress(IPAddress.Loopback);
    subjectAlternativeName.AddIpAddress(IPAddress.IPv6Loopback);
    request.CertificateExtensions.Add(subjectAlternativeName.Build());

    var certificate = request.CreateSelfSigned(
        DateTimeOffset.UtcNow.AddMinutes(-5),
        DateTimeOffset.UtcNow.AddYears(2));

    return new X509Certificate2(
        certificate.Export(X509ContentType.Pfx),
        (string?)null,
        X509KeyStorageFlags.Exportable | X509KeyStorageFlags.PersistKeySet);
  }

  private static void TrustCertificate(X509Certificate2 certificate)
  {
    using var store = new X509Store(StoreName.Root, StoreLocation.CurrentUser);
    store.Open(OpenFlags.ReadWrite);

    var existing = store.Certificates.Find(
        X509FindType.FindByThumbprint,
        certificate.Thumbprint,
        false);

    if (existing.Count == 0)
    {
      store.Add(new X509Certificate2(certificate.Export(X509ContentType.Cert)));
    }
  }
}
