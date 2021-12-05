extends Spatial


var spawnPoints
var cars = {}

var cameras = []
var camera_counter = 0

var track_was_sent = false
var player_track_initialized = {}

func _ready():
	spawnPoints = $WorldEnvironment/TrackWithStuff/CarPositions.get_children()
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
		Global.clients_ready_for_track_json[client] = null
	



func _process(_delta):
	for client in Global.clients:
		cars[client].change_speed(float(Global.player_speed[client]))
		
	var send_track_now = true
	for client in Global.clients:
		if not player_track_initialized[client] and Global.player_path[client] != null:
			pass
		if not Global.clients_ready_for_track_json.has(client):
			send_track_now = false
	if send_track_now and not track_was_sent:
		var track_meshes = {
		"Road": $WorldEnvironment/TrackWithStuff/Track/RootNode/Track
		}
		var track_node = $WorldEnvironment/TrackWithStuff
		var track_dict = $TrackTransformer.transform_track(track_meshes, track_node)
	
		Client.send_global_message("track_transmission", track_dict)
		# just for test
		$PathGenerator.initialize_track_area(track_meshes, track_node)
		# $PathGenerator.test_generate_path4area()
		track_was_sent = true
		
	

func _input(event):
	if event.is_action_pressed("ui_focus_next"):
		cameras[camera_counter].make_current()
		camera_counter = (camera_counter+1)%cameras.size()
