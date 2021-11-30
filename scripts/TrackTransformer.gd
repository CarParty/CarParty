extends Node


# Declare member variables here. Examples:
# var a = 2
# var b = "text"


# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

func _area_to_aabb(area: Area):
	var collision_shape = area.get_node("CollisionShape")
	var shape = collision_shape.shape as BoxShape
	return AABB(collision_shape.to_global(-shape.extents), shape.extents*2)

func _vertex_to_2d(v):
	return [v.x, v.z]

func _vertices_to_2d(vertices):
	var vertices_2d = []
	for v in vertices:
		vertices_2d.append(_vertex_to_2d(v))
	return vertices_2d


# track_meshes is a map from tags to MeshInstances
func transform_track(track_meshes: Dictionary, track_node: Spatial):
	var draw_area_node = track_node.get_node("DrawAreas")
	var shapes = {}
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
			#print(mdt.get_face_normal(face_id).y)
			#if mdt.get_face_normal(face_id).y < 0:
			#	continue
			var vertices = []
			for i in [0, 1, 2]:
				var vertex_local_space = mdt.get_vertex(mdt.get_face_vertex(face_id, i))
				vertices.append(track_meshes[tag].to_global(vertex_local_space))
			# double for is not quadratic time becuase 3 vertices only
			for area in draw_area_node.get_children():
				for v in vertices:
					var aabb = _area_to_aabb(area.get_node("Area"))
					# check if shape and v collide
					if aabb.has_point(v):
						shapes[area.name][tag].append(_vertices_to_2d(vertices))
						break
	# serialize areas
	for area in draw_area_node.get_children():
		for child in area.get_children():
			var aabb = _area_to_aabb(child)
			shapes[area.name][child.name] = {
				"position": _vertex_to_2d(aabb.position),
				"size": _vertex_to_2d(aabb.size)
			}
	return JSON.print(shapes)
