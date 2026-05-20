namespace Contoso.Domain.Contracts;

public interface IOrderGateway
{
  string Load(string orderId);
}
