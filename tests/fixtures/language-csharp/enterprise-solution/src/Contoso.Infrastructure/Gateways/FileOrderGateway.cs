using System.IO;

namespace Contoso.Infrastructure.Gateways;

public class FileOrderGateway
{
  public void Save(string orderId, string payload)
  {
    File.WriteAllText("artifacts/contoso-order.txt", $"{orderId}:{payload}");
  }

  public string Load(string orderId)
  {
    return File.Exists("artifacts/contoso-order.txt")
      ? File.ReadAllText("artifacts/contoso-order.txt")
      : orderId;
  }
}
