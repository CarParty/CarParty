extends Spatial


var spawnPoints
var cars = {}

var cameras = []
var camera_counter = 0

var track_was_sent = false
var player_track_initialized = {}
var finished_tracks = []
onready var track = $WorldEnvironment/TrackWithStuff2

func _ready():
	track.visible = true
	spawnPoints = track.get_node("CarPositions").get_children()
	cameras.append(get_node("WorldEnvironment/TrackWithStuff/Camera"))
	
	print(cameras)
	
	var index = 0
	for client in Global.clients:
		camera_counter = 1
		var car = load("res://scenes/Car.tscn").instance()
		$WorldEnvironment.add_child(car)
		car.rotation = spawnPoints[index].rotation
		car.global_transform = spawnPoints[index].global_transform
		cars[client] = car
		index += 1
		cameras.append(car.get_node("Camera"))
		player_track_initialized[client] = false
	Global.clients_ready_for_track_json = []

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
		cameras[camera_counter].make_current()
		camera_counter = (camera_counter+1)%cameras.size()
