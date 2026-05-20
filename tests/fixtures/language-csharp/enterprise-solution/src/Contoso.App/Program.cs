using Contoso.App.Controllers;
using Contoso.App.Workers;

namespace Contoso.App;

public static class Program
{
  public static void Main(string[] args)
  {
    var controller = new OrderController();
    var worker = new SyncWorker();
    Console.WriteLine(controller.LoadOrder("ORD-001").OrderId);
    worker.Sync("ORD-001");
  }
}
