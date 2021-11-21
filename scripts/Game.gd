extends Spatial


var spawnPoints
var cars = {}


func _ready():
	spawnPoints = $WorldEnvironment/TrackWithStuff/CarPositions.get_children()
	
	var index = 0
	for client in Global.clients:
		var car = load("res://scenes/Car.tscn").instance()
		$WorldEnvironment.add_child(car)
		car.rotation = spawnPoints[index].rotation
		car.global_transform = spawnPoints[index].global_transform
		cars[client] = car
		index += 1
		
func _process(_delta):
	for client in Global.clients:
		cars[client].change_speed(float(Global.player_speed[client]))
