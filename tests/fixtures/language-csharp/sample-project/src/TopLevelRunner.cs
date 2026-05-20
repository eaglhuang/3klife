using MyApp.Models;

var startup = new ApiResult<string>("ready", true);
Console.WriteLine(startup.Value);
