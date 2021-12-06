extends ImmediateGeometry


# Declare member variables here. Examples:
# var a = 2
# var b = "text"

# Called when the node enters the scene tree for the first time.
func _ready():
	pass
	
func draw_with_material(material):
	var path = get_parent()
	var curve = path.curve
	begin(5, material)
	var width = .1
	var put_up = Vector3(0, .1, 0)
	for i in curve.get_point_count():
		var a = curve.get_point_position(i) + put_up
		var b = curve.get_point_position((i + 1) % curve.get_point_count()) + put_up
		var direction = (b - a).normalized()
		# a -= direction * (width / 2);
		# b += direction * (width / 2);
		var right_angle = Vector3(direction.z, 0, direction.x).normalized()
		add_vertex(a - right_angle * width)
		add_vertex(b - right_angle * width)
		add_vertex(b + right_angle * width)
		add_vertex(a - right_angle * width)
		add_vertex(a + right_angle * width)
		add_vertex(b + right_angle * width)
	end()

# Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
#	pass
