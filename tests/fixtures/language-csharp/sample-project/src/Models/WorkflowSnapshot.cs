namespace MyApp.Models;

public record class WorkflowSnapshot(string Name, int Version)
{
  public required string Owner { get; init; }
}
