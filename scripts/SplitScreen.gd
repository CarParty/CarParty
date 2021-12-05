extends CanvasLayer

# Declare member variables here. Examples:
# var a = 2
# var b = "text"

const layouts = {
	1: [1, 1],
	2: [2, 1],
	3: [2, 2],
	4: [2, 2],
	5: [3, 2],
	6: [3, 2],
	7: [4, 2],
	8: [4, 2],
	9: [3, 3],
	10: [4, 3],
	11: [4, 3],
	12: [4, 3],
	13: [4, 4],
	14: [4, 4],
	15: [4, 4],
	16: [4, 4],
}

onready var viewport = load("res://scenes/utility/PlayerViewport.tscn")

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

func setup_for_cars(players_cars_map):
	var num_players = players_cars_map.size()
	var layout = layouts[num_players]
	var split_width = self.get_node("GridContainer").rect_size.x / layout[0]
	var split_height = self.get_node("GridContainer").rect_size.y / layout[1]
	
	self.get_node("GridContainer").columns = layout[0]

	for player_name in players_cars_map:
		var player_viewport = viewport.instance()
		var camera = player_viewport.get_node("Viewport/Camera")
		camera.transform = players_cars_map[player_name].transform
		camera.target = players_cars_map[player_name]
		self.get_node("GridContainer").add_child(player_viewport)
		player_viewport.set_size(Vector2(split_width, split_height))
		player_viewport.get_node("Viewport").set_size(Vector2(split_width, split_height))

	
