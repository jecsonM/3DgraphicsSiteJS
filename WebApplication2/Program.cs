using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".glb"] = "model/gltf+binary";
provider.Mappings[".gltf"] = "model/gltf+json";
provider.Mappings[".fbx"] = "model/fbx";
provider.Mappings[".png"] = "model/png]";
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider
});


app.UseStaticFiles();
app.UseRouting();

app.MapControllers(); 

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
