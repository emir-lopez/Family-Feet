var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Sirve index.html como página de inicio y los archivos de wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.Run();
