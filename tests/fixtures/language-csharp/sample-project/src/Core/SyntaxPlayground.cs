using CoreAlias = MyApp.Core.AliasToolkit;
using static MyApp.Core.CollectionExtensions;
using System.Collections.Generic;

namespace MyApp.Core;

public static class CollectionExtensions
{
  public static string JoinTokens(this IEnumerable<string> values, string separator)
  {
    return string.Join(separator, values);
  }

  public static T Identity<T>(this T value)
  {
    return value;
  }
}

public static class AliasToolkit
{
  public static string Tag(string value)
  {
    return $"alias:{value}";
  }
}

public static class SyntaxPlayground
{
  public static string Compose()
  {
    var items = new List<string> { "A", "B" };
    var overload = new Overloads();
    var numeric = overload.Sum(1, 2);
    var tagged = JoinTokens(items, ",");
    var aliasTagged = CoreAlias.Tag(tagged);
    var stable = Identity<int>(numeric);
    return $"{stable}:{aliasTagged}";
  }
}
