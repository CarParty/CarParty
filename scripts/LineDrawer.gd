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
	material.vertex_color_use_as_albedo = true
	material.emission_enabled = true
	material.emission_energy = 4.0
	material.emission = material.albedo_color
	set_material_override(material)
	begin(Mesh.PRIMITIVE_TRIANGLE_STRIP)
	var width = .1
	var put_up = Vector3(0, .1, 0)
	var arr = curve.get_baked_points()
	var l = arr.size()
	for i in l:
		var a = arr[i] + put_up
		var b = arr[(i + 1) % l] + put_up
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
