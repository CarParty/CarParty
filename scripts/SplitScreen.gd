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

var player_viewports = {}
var player_label = {}
var players_cars_map_local
var timer
signal start_race

onready var viewport = load("res://scenes/utility/PlayerViewport.tscn")

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.

func setup_for_cars(players_cars_map):
	players_cars_map_local = players_cars_map
	var num_players = players_cars_map.size()
	if num_players == 0:
		return
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
		player_viewports[player_name] = player_viewport
		
func start_timer(players_cars_map):
	var dynamic_font : DynamicFont = DynamicFont.new()
	dynamic_font.font_data = load("res://resources/fonts/Bungee-Regular.ttf")
	for player_name in players_cars_map:
		var player_viewport = player_viewports[player_name]
		dynamic_font.size = player_viewport.rect_size.x / 3
		var center = CenterContainer.new()
		var label: Label = Label.new()
		label.text = "3"
		label.add_font_override("font", dynamic_font)
		label.add_color_override("font_color_shadow", Color.black)
		label.add_constant_override("shadow_offset_x",player_viewport.rect_size.x/ 130)
		label.add_constant_override("shadow_offset_y",player_viewport.rect_size.x/ 130)
		label.add_constant_override("shadow_as_outline",1)
		center.size_flags_vertical = 3
		center.add_child(label)
		center.rect_size = player_viewport.rect_size
		player_viewport.add_child(center)
		player_label[player_name] = label
		
	timer = Timer.new()
	timer.connect("timeout",self,"_on_timer_timeout") 
	timer.set_wait_time(1) #value is in seconds: 600 seconds = 10 minutes
	timer.set_one_shot(false)
	add_child(timer) 
	timer.start() 
	
func _on_timer_timeout():
	for player_name in players_cars_map_local:
		var last_value = int(player_label[player_name].text)
		if last_value-1 <= 0:
			player_label[player_name].visible = false
			timer.stop()
			emit_signal("start_race")
		else:
			player_label[player_name].text = str(last_value-1)
	
