extends Node



var shapes = {}
var path_segment = {}
var path4test = []
# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

func _area_to_aabb(area: Area):
	var collision_shape = area.get_node("CollisionShape")
	var shape = collision_shape.shape as BoxShape
	return AABB(collision_shape.to_global(-shape.extents), shape.extents*2)

# 
func intial_track_area(track_meshes: Dictionary, track_node: Spatial):
	var draw_area_node = track_node.get_node("DrawAreas")
	for area in draw_area_node.get_children():
		shapes[area.name] = {}
	# serialize meshes
	for tag in track_meshes:
		for area in draw_area_node.get_children():
			shapes[area.name][tag] = []
		var mesh = track_meshes[tag].mesh
		var mdt = MeshDataTool.new()
		mdt.create_from_surface(mesh, 0)
		for face_id in mdt.get_face_count():
			
			var vertices = []
			for i in [0, 1, 2]:
				var vertex_local_space = mdt.get_vertex(mdt.get_face_vertex(face_id, i))
				vertices.append(track_meshes[tag].to_global(vertex_local_space))
				
				path4test.append(track_meshes[tag].to_global(vertex_local_space))
				
			# double for is not quadratic time becuase 3 vertices only
			for area in draw_area_node.get_children():
				for v in vertices:
					var aabb = _area_to_aabb(area.get_node("Area"))
					# check if shape and v collide
					if aabb.has_point(v):
						shapes[area.name][tag].append(vertices)
						break
	
	for area in draw_area_node.get_children():
		for child in area.get_children():
			var aabb = _area_to_aabb(child)
			shapes[area.name][child.name] = {
				"position": aabb.position,
				"size": aabb.size
			}
	

# path_2d: [[x,z], [x,z] ]
func generate_path4area(path_2d, area_name, tag):
	var temp_area = shapes[area_name]['Area']
	var max_y = temp_area['position'].y + temp_area['size'].y/2
	var dir = Vector3(0, -temp_area['size'].y, 0)
	var path_3d = []
	
	for point in path_2d:
		var point_from = Vector3(point[0], max_y, point[1])
		for triangle in shapes[area_name][tag]:
			var intersect_point = Geometry.ray_intersects_triangle(point_from, dir, triangle[0], triangle[1], triangle[2])
			if intersect_point is Vector3:
				path_3d.append(intersect_point)
				break
	path_segment[area_name] = path_3d
	return path_3d

func test_generate_path4area():
	# use original path as the path got from client
	var path_origin = get_parent().get_node("WorldEnvironment/Path")
	var points_array = get_parent().get_node("WorldEnvironment/Path").get_curve().get_baked_points()
	var path_2d = []
	for point in points_array:
		var p = path_origin.to_global(point)
		path_2d.append([p.x, p.z])
	
	var path_3d = generate_path4area(path_2d, "Area1", "Road")
	var draw = ImmediateGeometry.new()
	get_parent().get_node("WorldEnvironment").add_child(draw)
	var m = SpatialMaterial.new()
	m.vertex_color_use_as_albedo = true
	draw.set_material_override(m)
	draw.clear()
	draw.begin(Mesh.PRIMITIVE_LINE_STRIP)
	draw.set_color(Color( 0.55, 0, 0, 1 ))
	for x in path_3d:
		x.y += 1
		draw.add_vertex(x)
	
	draw.end()
	
	
