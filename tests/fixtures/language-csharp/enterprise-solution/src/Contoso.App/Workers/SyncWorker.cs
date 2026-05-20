using Contoso.Infrastructure.Gateways;

namespace Contoso.App.Workers;

public class SyncWorker
{
  private readonly FileOrderGateway _gateway = new();

  public void Sync(string orderId)
  {
    _gateway.Save(orderId, $"sync:{orderId}");
  }
}
