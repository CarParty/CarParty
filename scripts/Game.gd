extends Spatial


var spawnPoints
var cars = {}

var cameras = []
var camera_counter = 1

func _ready():
	spawnPoints = $WorldEnvironment/TrackWithStuff/CarPositions.get_children()
	cameras.append(get_node("WorldEnvironment/TrackWithStuff/Camera"))
	
	print(cameras)
	
	var index = 0
	for client in Global.clients:
		var car = load("res://scenes/Car.tscn").instance()
		$WorldEnvironment.add_child(car)
		car.rotation = spawnPoints[index].rotation
		car.global_transform = spawnPoints[index].global_transform
		cars[client] = car
		index += 1
		cameras.append(car.get_node("CameraTarget/Camera"))
	
	
	var track_meshes = {
		"Road": $WorldEnvironment/TrackWithStuff/Track/RootNode/Track
	}
	var track_node = $WorldEnvironment/TrackWithStuff
	$TrackTransformer.transform_track(track_meshes, track_node)

func _process(_delta):
	for client in Global.clients:
		cars[client].change_speed(float(Global.player_speed[client]))
	if Input.is_action_pressed("ui_focus_next"):
		cameras[camera_counter].make_current()
		camera_counter = (camera_counter+1)%cameras.size()
