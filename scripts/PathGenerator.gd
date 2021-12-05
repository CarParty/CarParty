extends Node

var TRISEARCHLENGTH = 100
var SEARCHBASE = 100
var SEARCHADDITION = 5000
var shapes = {}
# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

func _area_to_aabb(area: Area):
	var collision_shape = area.get_node("CollisionShape")
	var shape = collision_shape.shape as BoxShape
	return AABB(collision_shape.to_global(-shape.extents), shape.extents*2)

func initialize_track_area(track_meshes: Dictionary, track_node: Spatial):
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
			shapes[area.name][child.name] = aabb
			#print(area.name, child.name, aabb.position, aabb.size)
	

# path_2d: [[x,z], [x,z]]
# area_name should be same as the name of area in 'TrackWithStuff.tscn'
# tag: see the key of track_meshes in 'WorldEnvironment'
func generate_path4area(path_2d, area_name):
	var temp_area = shapes[area_name]['Area']
	var max_y = temp_area.position.y + temp_area.size.y
	var dir = Vector3(0, -temp_area.size.y, 0)
	var path_3d = []
	var tri_count = {}
	for tag in shapes[area_name]:
		if not shapes[area_name][tag] is Array:
				continue
		tri_count[tag] = shapes[area_name][tag].size()
		print("tri_count   ",tri_count[tag],"  tag  ",tag )
	var last_index = -1
	var front = 0
	var tail = tri_count["TrackObject"]
	
	for point in path_2d:
		var is_find = false
		var point_from = Vector3(point[0], max_y, point[1])
		for tag in shapes[area_name]:
			if tag != 'TrackObject':
				continue
			if not shapes[area_name][tag] is Array:
				continue
				
			var count = tri_count[tag]
			if count < 2*TRISEARCHLENGTH:
				if front < tail:
					var res = search_intersect_by_index(point_from,dir,shapes[area_name][tag],front,tail,count,temp_area, last_index)
					if res is Dictionary:
						front = res["front"]
						tail = res["tail"]
#						TRISEARCHLENGTH = (2*(front+TRISEARCHLENGTH-last_index))%count
						is_find = true
						if "intersect_point" in res:
							path_3d.append(res["intersect_point"])
							
						
				else:
					var res = search_intersect_by_index(point_from,dir,shapes[area_name][tag],front,count,count,temp_area, last_index)
					if res is Dictionary:
						front = res["front"]
						tail = res["tail"]
#						TRISEARCHLENGTH = (2*(front+TRISEARCHLENGTH-last_index))%count
						is_find = true
						if "intersect_point" in res:
							path_3d.append(res["intersect_point"])
							
					else:
						res = search_intersect_by_index(point_from,dir,shapes[area_name][tag],0,tail,count,temp_area, last_index)
						if res is Dictionary:
							front = res["front"]
							tail = res["tail"]
#							TRISEARCHLENGTH = (2*(front+TRISEARCHLENGTH-last_index))%count
							is_find = true
							if "intersect_point" in res:
								path_3d.append(res["intersect_point"])
								
							
			if not is_find:		
				var res = search_intersect_by_index(point_from,dir,shapes[area_name][tag],0,count,count,temp_area, last_index)
				if res is Dictionary:
					front = res["front"]
					tail = res["tail"]
#					TRISEARCHLENGTH = (front+TRISEARCHLENGTH-last_index)%count + SEARCHBASE
					if "intersect_point" in res:
						path_3d.append(res["intersect_point"])
#				
					
	#{"Path": ..., "Path in FinishArea": ...}
	var path_dict = {}
	path_dict["Path"] = path_3d 
	var aabb = null
	for area in shapes[area_name]:
		if area.find("Finish",0) != -1:
			aabb = shapes[area_name][area]
			break
	var path_in_finish = []
	for point in path_3d:
		if aabb.has_point(point):
			path_in_finish.append(point)
	path_dict["PathInFinishArea"] = path_in_finish
	return path_dict


# merge path_segment
# mode: "LOOP" or "STRIP" 
# path_segment: {area_name: {"Path": [Vector3], "PathInFinishArea": [Vector3]}}
# return Path Node
func merge_path_to_node(mode, path_segment):
	var curve = Curve3D.new()
	var path_in_finish = null
#	var path_3d = []
	for area_name in path_segment:
		for points in path_segment[area_name]["Path"]:
			if path_in_finish != null and points in path_in_finish:
				continue
			curve.add_point(points)
#			path_3d.append(points)
		path_in_finish = path_segment[area_name]["PathInFinishArea"]
	
	# if the path is a loop, delete the points in the last finish area to avoid overlap.
	if mode == "LOOP":
		var curve_len = curve.get_point_count() 
		for i in range(1, path_in_finish.size()+1):
			curve.remove_point(curve_len-i)
	var path_node = Path.new()
	path_node.set_curve(curve)
#	test_by_draw(path_3d)
	return path_node


func test_by_draw(path_3d):
	var draw = ImmediateGeometry.new()
	get_parent().get_node("WorldEnvironment").add_child(draw)
	var m = SpatialMaterial.new()
	m.vertex_color_use_as_albedo = true
	draw.set_material_override(m)
	draw.clear()
	draw.begin(Mesh.PRIMITIVE_LINE_LOOP)
	draw.set_color(Color( 0, 0, 0, 0 ))
	for x in path_3d:
		x.y += 1
		draw.add_vertex(x)
	draw.end()
	
func search_intersect_by_index(point_from, dir, tri_list, front, tail, count, temp_area, last_index):
	var res = {}
	for i in range(front,tail):
		var triangle = tri_list[i]
		var intersect_point = Geometry.ray_intersects_triangle(point_from, dir, triangle[0], triangle[1], triangle[2])
		if intersect_point is Vector3:
			TRISEARCHLENGTH = (i-last_index+SEARCHBASE)%count
			res["front"] = (i - TRISEARCHLENGTH)%count
			res["tail"] = (i+TRISEARCHLENGTH)%count
#			print("front:  ",front, "  tail:  ",tail)
			if temp_area.has_point(intersect_point):
				intersect_point.y += 0.1
				res["intersect_point"] = intersect_point
				
	#		else:
	#			print(area_name,"  ",intersect_point)
			return res
			break
	pass

# func test_generate_path4area():
# 	# use original path as the path got from client
# 	var path_origin = get_parent().get_node("WorldEnvironment/Path")
# 	var points_array = get_parent().get_node("WorldEnvironment/Path").get_curve().get_baked_points()
# 	var path_2d = []
# 	for point in points_array:
# 		var p = path_origin.to_global(point)
# 		path_2d.append([p.x, p.z])
	
# 	var path_2d_area1 = []
# 	var path_2d_area2 = []
# 	var aabb_area1 = shapes["Area1"]["Area"]
# 	var aabb_area2 = shapes["Area2"]["Area"]
# 	var area1_start = Vector3(aabb_area1.position.x-aabb_area1.size.x, aabb_area1.position.y, aabb_area1.position.z-aabb_area1.size.z)
# 	var area1_end = Vector3(aabb_area1.position.x+aabb_area1.size.x, aabb_area1.position.y, aabb_area1.position.z-aabb_area1.size.z)
# 	var area2_start = Vector3(aabb_area2.position.x+aabb_area2.size.x, aabb_area2.position.y, aabb_area2.position.z+aabb_area2.size.z)
# 	var area2_end = Vector3(aabb_area2.position.x-aabb_area2.size.x, aabb_area2.position.y, aabb_area2.position.z+aabb_area2.size.z)
# 	var curve = path_origin.get_curve()
# 	var point1_start = curve.get_closest_point(path_origin.to_local(area1_start))
# 	var point1_end = curve.get_closest_point(path_origin.to_local(area1_end))
# 	var point2_start = curve.get_closest_point(path_origin.to_local(area2_start))
# 	var point2_end = curve.get_closest_point(path_origin.to_local(area2_end))
# 	var point1_start_index = 0
# 	var point1_end_index = 0
# 	var point2_start_index = 0
# 	var point2_end_index = 0
# 	for i in range(points_array.size()):
# 		if point1_start == points_array[i]:
# 			point1_start_index = i
# 		if point1_end == points_array[i]:
# 			point1_end_index = i
# 		if point2_start == points_array[i]:
# 			point2_start_index = i
# 		if point2_end == points_array[i]:
# 			point2_end_index = i
# 	point1_start_index = point2_end_index
# 	if point1_start_index < point1_end_index:
# 		for i in range(point1_start_index, point1_end_index+1):
# 			path_2d_area1.append(path_2d[i])
# 	elif point1_start_index > point1_end_index:
# 		for i in range(point1_start_index, points_array.size()):
# 			path_2d_area1.append(path_2d[i])
# 		for i in range(0, point1_end_index+1):
# 			path_2d_area1.append(path_2d[i])
	
# 	if point2_start_index < point2_end_index:
# 		for i in range(point2_start_index, point2_end_index+1):
# 			path_2d_area2.append(path_2d[i])
# 	elif point2_start_index > point2_end_index:
# 		for i in range(point2_start_index, points_array.size()):
# 			path_2d_area2.append(path_2d[i])
# 		for i in range(0, point2_end_index+1):
# 			path_2d_area2.append(path_2d[i])
	
# 	print(points_array.size())
# 	print(path_2d_area1.size())
# 	print(path_2d_area2.size())
# #	var path_dict = generate_path4area(path_2d, "Area2", "Road")
# #	var path_3d = path_dict["Path"]
# #	var path_in_finish = path_dict["PathInFinishArea"]
# 	var path_segment = {}
# 	path_segment["Area1"] = generate_path4area(path_2d_area1, "Area1", "Road")
# 	path_segment["Area2"] = generate_path4area(path_2d_area2, "Area2", "Road")
# 	var path_3d = merge_path_to_node("LOOP", path_segment).get_curve().get_baked_points()
	
	
# 	var draw = ImmediateGeometry.new()
# 	get_parent().get_node("WorldEnvironment").add_child(draw)
# 	var m = SpatialMaterial.new()
# 	m.vertex_color_use_as_albedo = true
# 	draw.set_material_override(m)
# 	draw.clear()
# 	draw.begin(Mesh.PRIMITIVE_LINE_LOOP)
# 	draw.set_color(Color( 0, 0, 0, 0 ))
# 	for x in path_3d:
# 		x.y += 1
# 		draw.add_vertex(x)
# 	draw.end()
# #
# #	draw.begin(Mesh.PRIMITIVE_LINE_STRIP)
# #	draw.set_color(Color( 0, 1, 1, 1 ))
# #	for x in path_in_finish:
# #		x.y += 1
# #		draw.add_vertex(x)
# #	draw.end()


