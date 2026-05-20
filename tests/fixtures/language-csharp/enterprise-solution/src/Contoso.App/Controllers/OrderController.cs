using Contoso.App.Models;
using Contoso.Domain.Services;

namespace Contoso.App.Controllers;

public class OrderController
{
  private readonly OrderService _service = new();

  public OrderDto LoadOrder(string orderId)
  {
    var order = _service.GetOrder(orderId);
    return new OrderDto { OrderId = order.Id, Customer = order.CustomerName };
  }
}
