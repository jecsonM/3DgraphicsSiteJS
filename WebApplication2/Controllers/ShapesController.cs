using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers
{
    [ApiController]
    [Route("api/shapes")]
    public class ShapesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ShapesController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            List<ShapeEntity> items = await _db.Shapes.OrderBy(x => x.Id).ToListAsync();
            return Ok(items);
        }

        public class CreateShapeDto
        {
            public int Type { get; set; }         
            public float X { get; set; }
            public float Y { get; set; }
            public float Z { get; set; }
            public JsonElement Params { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateShapeDto dto)
        {
            if (!Enum.IsDefined(typeof(ShapeType), dto.Type))
                return BadRequest("Unknown shape type");

            var type = (ShapeType)dto.Type;

            
            if (type == ShapeType.Box)
            {
                if (!dto.Params.TryGetProperty("width", out _) ||
                    !dto.Params.TryGetProperty("height", out _) ||
                    !dto.Params.TryGetProperty("depth", out _))
                    return BadRequest("Box requires width/height/depth");
            }
            else if (type == ShapeType.Sphere)
            {
                if (!dto.Params.TryGetProperty("radius", out _))
                    return BadRequest("Sphere requires radius");
            }
            else if (type == ShapeType.Torus)
            {
                if (!dto.Params.TryGetProperty("radius", out _) ||
                    !dto.Params.TryGetProperty("tube", out _))
                    return BadRequest("Torus requires radius and tube");
            }

            var entity = new ShapeEntity
            {
                Type = type,
                X = dto.X,
                Y = dto.Y,
                Z = dto.Z,
                ParamsJson = dto.Params.GetRawText()
            };

            _db.Shapes.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(entity);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _db.Shapes.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFound();

            _db.Shapes.Remove(entity);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
