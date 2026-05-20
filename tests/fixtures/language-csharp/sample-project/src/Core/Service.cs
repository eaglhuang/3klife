using System.IO;

namespace MyApp.Core;

public enum ServiceMode
{
  Basic,
  Advanced
}

public struct ServiceResult
{
  public int Code;
  public string Message { get; set; }
}

public class Service : IService
{
  private readonly ServiceMode _mode = ServiceMode.Basic;
  public string LastMessage { get; private set; } = string.Empty;

  public string BuildMessage(string who)
  {
    var prefix = File.Exists("templates/message.txt")
      ? File.ReadAllText("templates/message.txt")
      : "Hello";
    LastMessage = $"{prefix}, {who}";
    return LastMessage;
  }
}
