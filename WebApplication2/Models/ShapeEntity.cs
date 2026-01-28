using System.ComponentModel.DataAnnotations;

namespace WebApplication2.Models
{
    public class ShapeEntity
    {
        public int Id { get; set; }
        public ShapeType Type { get; set; }

        public float X { get; set; }
        public float Y { get; set; }
        public float Z { get; set; }

        [Required]
        public string ParamsJson { get; set; } = "{}";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
