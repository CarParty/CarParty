extends Spatial


var spawnPoints
var cars = {}
var cars_to_client_id = {}
var car_progress = {}
var car_rounds_completed = {}
var car_progress_global_transform = {}
var car_paths = {}

var cameras = []
var camera_counter = 0

var track_was_sent = false
var player_track_initialized = {}
var finished_tracks = []

var time_start = 0

onready var track_path = "res://scenes/tracks/TrackWithStuff.tscn"
var track

func _ready():
	track = load(track_path).instance()
	$WorldEnvironment.add_child(track)
	spawnPoints = track.get_node("CarPositions").get_children()
	cameras.append(track.get_node("Camera"))
	cameras[0].make_current()
	
	for progress_node in track.get_node("ProgressNodes").get_children():
		progress_node.connect("safepoint_reached", self, "_on_car_progress")
	$WorldEnvironment.get_node("FellOffTrack").connect("fell_off_track", self, "_respawn_car")
	$WorldEnvironment/SplitScreen.connect("start_race", self, "_start_racing_game")
	
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
		car_progress_global_transform[client] = {}
		car_progress_global_transform[client][-1] = car.global_transform
		index += 1
		player_track_initialized[client] = false
	Global.clients_ready_for_track_json = []
	$WorldEnvironment/SplitScreen.setup_for_cars(cars)

func _process(_delta):
	for client in Global.clients:
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
		_start_racing_game_timer()
	if send_track_now and not track_was_sent:
		var track_meshes = track.get_node("Track").tags_to_meshes
		for tag in track_meshes:
			track_meshes[tag] = track.get_node("Track/" + track_meshes[tag])
		var track_node = track
		var track_dict = {"track": $TrackTransformer.transform_track(track_meshes, track_node)}
	
		Client.send_global_message("track_transmission", track_dict)
		# just for test
		$PathGenerator.initialize_track_area(track_meshes, track_node)
		# $PathGenerator.test_generate_path4area()
		track_was_sent = true
		
func _start_racing_game_timer():
	Client.start_phase_global("racing")
	for client in Global.clients:
		generate_path_from_json(client, Global.player_path[client])
	$WorldEnvironment/SplitScreen.start_timer(cars)
	
func _start_racing_game():
	for client in Global.clients:
		cars[client].set_path(car_paths[client])
	time_start = OS.get_unix_time()

func generate_path_from_json(client, path):
	var path_map = {}
	for area in path:
		path_map[area] = $PathGenerator.generate_path4area(path[area], area)
	var path_node = $PathGenerator.merge_path_to_node("LOOP", path_map)
	self.add_child(path_node)
	car_paths[client] = path_node

func _input(event):
	if event.is_action_pressed("ui_focus_next"):
		$WorldEnvironment/SplitScreen/GridContainer.visible = not $WorldEnvironment/SplitScreen/GridContainer.visible
	if event.is_action_pressed("ui_cancel"):
		for car in cars.values():
			_respawn_car(car)
		
func _on_car_progress(point, car):
	var id = cars_to_client_id[car]
	var compare_point = car_progress[id] + 1 % (track.get_node("ProgressNodes").get_children().size())
	if point == compare_point:
		car_progress[id] = point
		car_progress_global_transform[id][point] = car.global_transform.translated(Vector3(0,1,0))
	if point == track.get_node("ProgressNodes").get_children().size() - 1:
		car_rounds_completed[id] += 1
	if car_rounds_completed[id] == 3:
		Global.player_time_to_finish[id] = OS.get_unix_time()-time_start
	var all_have_completed = true
	for client in Global.clients:
		if car_rounds_completed[client] < 3:
			all_have_completed = false
	if all_have_completed:
		Global.goto_scene("res://scenes/Scoreboard.tscn")
		
	
func _respawn_car(car):
	car.engine_force = 0
	car.brake = 0
	car.throttle_mult = 0
	car.brake_mult = 0
	car.global_transform = car_progress_global_transform[cars_to_client_id[car]][car_progress[cars_to_client_id[car]]]
