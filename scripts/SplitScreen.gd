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
var player_time_label = {}
var player_round_label = {}
var players_cars_map_local
var players_camera_visual_layer = {}
var timer
signal start_race

onready var viewport = load("res://scenes/utility/PlayerViewport.tscn")

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.
	
func _process(delta):
	if Global.race_time >= 0:
		Global.race_time += delta
		var ms = fmod(Global.race_time,1)*100
		var seconds = fmod(Global.race_time,60)
		var minutes = fmod(Global.race_time, 3600) / 60
		var str_elapsed = "%02d:%02d:%02d" % [minutes, seconds, ms]
		for player_name in players_cars_map_local:
			player_time_label[player_name].text = str_elapsed

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
		if players_camera_visual_layer != {}:
			for pn in players_camera_visual_layer:
				if pn != player_name:
					camera.set_cull_mask_bit(players_camera_visual_layer[pn], false)
		
		self.get_node("GridContainer").add_child(player_viewport)
		player_viewport.set_size(Vector2(split_width, split_height))
		player_viewport.get_node("Viewport").set_size(Vector2(split_width, split_height))
		player_viewports[player_name] = player_viewport

func setup_for_camera_visual_layer(players_layers_map):
	players_camera_visual_layer = players_layers_map

func start_timer(players_cars_map):
	var dynamic_font : DynamicFont = DynamicFont.new()
	dynamic_font.font_data = load("res://resources/fonts/Bungee-Regular.ttf")
	var dynamic_font_2 : DynamicFont = DynamicFont.new()
	dynamic_font_2.font_data = load("res://resources/fonts/Bungee-Regular.ttf")
	for player_name in players_cars_map:
		var player_viewport = player_viewports[player_name]
		
		# Countdown
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
		
		# Countup
		dynamic_font_2.size = player_viewport.rect_size.x / 26
		var time_label: Label = Label.new()
		time_label.text = "00:00:00"
		time_label.add_font_override("font", dynamic_font_2)
		time_label.add_color_override("font_color_shadow", Color.black)
		time_label.add_constant_override("shadow_offset_x",2)
		time_label.add_constant_override("shadow_offset_y",2)
		time_label.add_constant_override("shadow_as_outline",0)
		time_label.align = Label.ALIGN_LEFT
		time_label.valign = Label.VALIGN_BOTTOM
		time_label.rect_size = player_viewport.rect_size
		time_label.margin_left = player_viewport.rect_size.x / 10
		time_label.margin_right = player_viewport.rect_size.x
		time_label.margin_top = 0
		time_label.margin_bottom = player_viewport.rect_size.y - player_viewport.rect_size.y / 10
		player_viewport.add_child(time_label)
		player_time_label[player_name] = time_label

		var name_label: Label = Label.new()
		name_label.text = player_name
		name_label.add_font_override("font", dynamic_font_2)
		name_label.add_color_override("font_color_shadow", Color.black)
		name_label.add_constant_override("shadow_offset_x",2)
		name_label.add_constant_override("shadow_offset_y",2)
		name_label.add_constant_override("shadow_as_outline",0)
		name_label.align = Label.ALIGN_RIGHT
		name_label.valign = Label.VALIGN_BOTTOM
		name_label.rect_size = player_viewport.rect_size
		name_label.margin_left = 0
		name_label.margin_right = player_viewport.rect_size.x / 10
		name_label.margin_top = 0
		name_label.margin_bottom = player_viewport.rect_size.y - player_viewport.rect_size.y / 10
		player_viewport.add_child(name_label)
		
		# Round
		var round_count: Label = Label.new()
		round_count.text = "1/3"
		round_count.add_font_override("font", dynamic_font_2)
		round_count.add_color_override("font_color_shadow", Color.black)
		round_count.add_constant_override("shadow_offset_x",1)
		round_count.add_constant_override("shadow_offset_y",1)
		round_count.add_constant_override("shadow_as_outline",1)
		round_count.align = Label.ALIGN_LEFT
		round_count.valign = Label.VALIGN_TOP
		round_count.rect_size = player_viewport.rect_size
		round_count.margin_left = player_viewport.rect_size.x / 10
		round_count.margin_right = player_viewport.rect_size.x
		round_count.margin_top = player_viewport.rect_size.y / 10
		round_count.margin_bottom = player_viewport.rect_size.y
		player_viewport.add_child(round_count)
		player_round_label[player_name] = round_count
		
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
			Global.race_time = 0
		else:
			player_label[player_name].text = str(last_value-1)
			
func _increase_round_count(player_id):
	var current_label = player_round_label[player_id].text
	var resulting_label
	if current_label == "1/3":
		resulting_label = "2/3"
	elif current_label == "2/3":
		resulting_label = "3/3"
	else:
		resulting_label = "3/3"
	
	player_round_label[player_id].text = resulting_label
	
