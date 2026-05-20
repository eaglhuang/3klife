namespace MyApp.Models;

[Serializable]
public record ApiResult<T>(T Value, bool Ok)
{
  public class NestedBucket
  {
    public string Label { get; set; } = "bucket";
  }
}
