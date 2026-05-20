using System;
using MyApp.Core;
using MyApp.Generated;

namespace MyApp.App;

public partial class Program
{
  public static int RetryCount = 3;
  public string Name { get; set; } = "atm";

  public static void Main(string[] args)
  {
    var service = new Service();
    var message = service.BuildMessage("ATM");
    Console.WriteLine(message);
    FileBridge.WriteOutput("artifacts/csharp-output.txt", message);
  }

  public int Compute(int value)
  {
    return value + RetryCount;
  }
}
