extends Spatial


var spawnPoints
var cars = {}
var cars_to_client_id = {}
var car_progress = {}
var car_rounds_completed = {}
var car_progress_global_transform = {}
var car_paths = {}
var car_visual_layer = {}
var car_race_completed = {}

var cameras = []
var camera_counter = 0

var track_was_sent = false
var player_track_initialized = {}
var finished_tracks = []

var scene_path_to_load

onready var track_path = "res://scenes/tracks/TrackWithStuff.tscn"
var track

var current_running_thread = null

func _ready():
	track = load(track_path).instance()
	$WorldEnvironment.add_child(track)
	spawnPoints = track.get_node("CarPositions").get_children()
	cameras.append(track.get_node("Camera"))
	cameras[0].make_current()

	$WorldEnvironment/SplitScreen.layer = 1
	$WorldEnvironment/TopCamera.layer = 2
	
	var track_camera = track.get_node("Camera")
	track_camera.current = false
	$WorldEnvironment/TopCamera/ViewportContainer/Viewport/OverlookingCamera.transform = track_camera.transform
	$WorldEnvironment/TopCamera/ViewportContainer/Viewport/OverlookingCamera.fov = track_camera.fov
	
	for progress_node in track.get_node("ProgressNodes").get_children():
		progress_node.connect("safepoint_reached", self, "_on_car_progress")
	$WorldEnvironment.get_node("FellOffTrack").connect("fell_off_track", self, "_respawn_car")
	$WorldEnvironment/SplitScreen.connect("start_race", self, "_start_racing_game")
	Client.connect("respawn_car", self, "_respawn_car_player_id")
	Client.connect("drift_car", self, "_drift_car")
	
	var index = 0
	
	for client in Global.clients:
		camera_counter = 1
		var car = preload("res://scenes/Car.tscn").instance()
		car.color = Global.player_color[client]
		$WorldEnvironment.add_child(car)
		car.rotation = spawnPoints[index].rotation
		car.global_transform = spawnPoints[index].global_transform
		cars[client] = car
		cars_to_client_id[car] = client
		car_progress[client] = -1
		car_rounds_completed[client] = 0
		car_race_completed[client] = false
		car_progress_global_transform[client] = {}
		car_progress_global_transform[client][-1] = car.global_transform
		#set layer mask and cull mask!!!
		#start from 5th layer 
		car_visual_layer[client] = 4+index
		car.set_path_visual_layer(4+index)
		index += 1
		player_track_initialized[client] = false
	Global.clients_ready_for_track_json = []
	$WorldEnvironment/SplitScreen.setup_for_camera_visual_layer(car_visual_layer)
	$WorldEnvironment/SplitScreen.setup_for_cars(cars)

func _process(_delta):
	for client in Global.clients:
		# only if the car doesn't compelte the race
		if car_race_completed[client]:
			continue
		cars[client].change_speed(float(Global.player_speed[client]))
		
	var send_track_now = true
	for client in Global.clients:
		if not player_track_initialized[client] and client in Global.player_path:
			player_track_initialized[client] = true
			finished_tracks.append(client)
		if not Global.clients_ready_for_track_json.has(client):
			send_track_now = false
	if finished_tracks.size() == cars.size() and finished_tracks.size() != 0:
		finished_tracks.clear()	
		current_running_thread = build_racing_tracks()
	if send_track_now and not track_was_sent:
		track_was_sent = true
		current_running_thread = generate_track()
	
	if current_running_thread != null and current_running_thread.is_valid():
		var time_start = OS.get_ticks_msec()
		var time_now = time_start
		while (time_now - time_start) < 25 and current_running_thread is GDScriptFunctionState and current_running_thread.is_valid():
			current_running_thread = current_running_thread.resume()
			time_now = OS.get_ticks_msec()

func generate_track():
	yield()
	$WorldEnvironment/TopCamera/Loading.visible = true
	var track_meshes = track.get_node("Track").tags_to_meshes
	for tag in track_meshes:
		track_meshes[tag] = track.get_node("Track/" + track_meshes[tag])
	var track_node = track
	
	var transform_result = $TrackTransformer.transform_track(track_meshes, track_node)
	while transform_result is GDScriptFunctionState and transform_result.is_valid():
		yield()
		transform_result = transform_result.resume()

	var track_dict = {"track": transform_result}

	Client.send_global_message("track_transmission", track_dict)
	# just for test
	var initialize_result = $PathGenerator.initialize_track_area(track_meshes, track_node)
	while initialize_result is GDScriptFunctionState and initialize_result.is_valid():
		yield()
		initialize_result = initialize_result.resume()
		
	$WorldEnvironment/TopCamera/Loading.visible = false

		
func build_racing_tracks():
	yield()
	$WorldEnvironment/TopCamera/Loading.visible = true
	Client.start_phase_global("racing")
	for client in Global.clients:
		var generate_result = generate_path_from_json(client, Global.player_path[client])
		while generate_result is GDScriptFunctionState and generate_result.is_valid():
			yield()
			generate_result = generate_result.resume()
	$WorldEnvironment/SplitScreen.start_timer(cars)
	$WorldEnvironment/TopCamera/Loading.visible = false
	$WorldEnvironment/SplitScreen.layer = 2
	$WorldEnvironment/TopCamera.layer = 1
	
func _start_racing_game():
	for client in Global.clients:
		cars[client].set_path(car_paths[client])

func generate_path_from_json(client, path):
	var path_map = {}
	for area in path:
		path_map[area] = $PathGenerator.generate_path4area(path[area], area)
		while path_map[area] is GDScriptFunctionState and path_map[area].is_valid():
			yield()
			path_map[area] = path_map[area].resume()
	var path_node = $PathGenerator.merge_path_to_node("LOOP", path_map)
	self.add_child(path_node)
	car_paths[client] = path_node

func _input(event):
	if event.is_action_pressed("ui_focus_next"):
		var tmp_layer = $WorldEnvironment/SplitScreen.layer
		$WorldEnvironment/SplitScreen.layer = $WorldEnvironment/TopCamera.layer
		$WorldEnvironment/TopCamera.layer = tmp_layer
	if event.is_action_pressed("ui_cancel"):
		for car in cars.values():
			_respawn_car(car)
		
func _on_car_progress(point, car):
	var id = cars_to_client_id[car]
	
	# check whether we did not just drive backwards but passed all progressnodes
	var compare_point = (car_progress[id] + 1) % (track.get_node("ProgressNodes").get_children().size())
	if point == compare_point:
		car_progress[id] = point
		car_progress_global_transform[id][point] = car.global_transform.translated(Vector3(0,0,0))
		if point == track.get_node("ProgressNodes").get_children().size() - 1:
			car_rounds_completed[id] += 1
			$WorldEnvironment/SplitScreen._increase_round_count(id)
	if car_rounds_completed[id] == 3 and Global.player_time_to_finish[id] == -1:
		var time = Global.race_time
		Global.player_time_to_finish[id] = time
		# let car self-driving
		# let camera orbit the car
		car_race_completed[id] = true
		$WorldEnvironment/SplitScreen.rotate_camera(id)
		
	var all_have_completed = true
	for client in Global.clients:
		if car_rounds_completed[client] < 3:
			all_have_completed = false
	if all_have_completed:
		scene_path_to_load = "res://scenes/Scoreboard.tscn"
		$FadeIn.show()
		$FadeIn.fade_in()
		

func _respawn_car(car):
	if car_race_completed[cars_to_client_id[car]]:
		return
	car.linear_velocity = Vector3.ZERO
	car.engine_force = 0
	car.brake = 0
	car.throttle_mult = 0
	car.brake_mult = 0
	car.linear_velocity = Vector3.ZERO
	car.global_transform = car_progress_global_transform[cars_to_client_id[car]][car_progress[cars_to_client_id[car]]].translated(Vector3(0,.2,0))
	var velocity = Vector3.ZERO
	velocity.y = 1
	car.linear_velocity = velocity

func _respawn_car_player_id(player_id):
	_respawn_car(cars[player_id])
	
func _drift_car(player_id, pressed):
	if car_race_completed[player_id]:
		return
	if pressed:
		cars[player_id].get_node("Wheel2").set_friction_slip(1)
		cars[player_id].get_node("Wheel3").set_friction_slip(1)
	else:
		cars[player_id].get_node("Wheel2").set_friction_slip(3)
		cars[player_id].get_node("Wheel3").set_friction_slip(3)

func _on_FadeIn_fade_finished():
	Global.goto_scene(scene_path_to_load)
