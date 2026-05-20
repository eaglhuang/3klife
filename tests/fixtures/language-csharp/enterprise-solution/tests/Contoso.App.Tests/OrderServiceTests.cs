using Contoso.Domain.Services;

namespace Contoso.App.Tests;

public class OrderServiceTests
{
  public string ShouldLoadOrder()
  {
    var service = new OrderService();
    return service.GetOrder("ORD-TEST").Id;
  }
}
