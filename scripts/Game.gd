extends Spatial


var spawnPoints
var cars = {}
var cars_to_client_id = {}
var car_progress = {}
var car_progress_global_transform = {}

var cameras = []
var camera_counter = 0

var track_was_sent = false
var player_track_initialized = {}
var finished_tracks = []

onready var track_path = "res://scenes/tracks/TrackTestWithStuff.tscn"
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
	
	var index = 0
	for client in Global.clients:
		camera_counter = 1
		var car = load("res://scenes/Car.tscn").instance()
		$WorldEnvironment.add_child(car)
		car.rotation = spawnPoints[index].rotation
		car.global_transform = spawnPoints[index].global_transform
		cars[client] = car
		cars_to_client_id[car] = client
		car_progress[client] = -1
		car_progress_global_transform[client] = {}
		car_progress_global_transform[client][-1] = car.global_transform
		index += 1
		cameras.append(car.get_node("Camera"))
		player_track_initialized[client] = false
	Global.clients_ready_for_track_json = []
	$WorldEnvironment/SplitScreen.setup_for_cars(cars)

func _process(_delta):
	for client in Global.clients:
		cars[client].change_speed(float(Global.player_speed[client]))
		
	var send_track_now = true
	for client in Global.clients:
		if not player_track_initialized[client] and client in Global.player_path:
			generate_path_from_json(client, Global.player_path[client])
			Global.player_path.erase(client)
			finished_tracks.append(client)
		if not Global.clients_ready_for_track_json.has(client):
			send_track_now = false
	if finished_tracks.size() == cars.size() and finished_tracks.size() != 0:
		Client.start_phase_global("racing")
		finished_tracks.clear()
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
		
func generate_path_from_json(client, path):
	var path_map = {}
	for area in path:
		path_map[area] = $PathGenerator.generate_path4area(path[area], area)
	var path_node = $PathGenerator.merge_path_to_node("LOOP", path_map)
	self.add_child(path_node)
	print(path_node.curve.get_point_count())
	cars[client].set_path(path_node)

func _input(event):
	if event.is_action_pressed("ui_focus_next"):
		$WorldEnvironment/SplitScreen/GridContainer.visible = not $WorldEnvironment/SplitScreen/GridContainer.visible
		
func _on_car_progress(point, car):
	var id = cars_to_client_id[car]
	car_progress[id] = point
	car_progress_global_transform[id][point] = car.global_transform
	#Global.goto_scene("res://scenes/Scoreboard.tscn")
	
func _respawn_car(car):
	car.engine_force = 0
	car.brake = 0
	car.global_transform = car_progress_global_transform[cars_to_client_id[car]][car_progress[cars_to_client_id[car]]]
