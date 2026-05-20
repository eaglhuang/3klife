using Contoso.Domain.Entities;

namespace Contoso.Domain.Services;

public class OrderService
{
  public Order GetOrder(string orderId)
  {
    return new Order { Id = orderId, CustomerName = "Contoso" };
  }
}
