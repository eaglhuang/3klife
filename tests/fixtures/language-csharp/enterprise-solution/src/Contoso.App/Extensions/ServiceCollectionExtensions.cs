namespace Contoso.App.Extensions;

public static class ServiceCollectionExtensions
{
  public static string AddContosoApp(this string services)
  {
    return $"{services}:contoso";
  }
}
