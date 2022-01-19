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
var player_standing_label = {}
var player_standing_ending_label = {}
var player_countdown_label = {}
var players_cars_map_local
var players_camera_visual_layer = {}
var players_complete_race = {}
var timer
var is_anyone_complete = false
#default
var final_countdown = 60
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
			if players_complete_race[player_name]:
				continue
			player_time_label[player_name].text = str_elapsed

func update_viewport_sizes():
	var window_size = OS.window_size
	var grid_container = self.get_node("GridContainer")
	var num_players = players_cars_map_local.size()
	var layout = layouts[num_players]
	var split_width = window_size.x / layout[0]
	var split_height = window_size.y / layout[1]
	for viewport_node in self.get_node("GridContainer").get_children():
		viewport_node.set_size(Vector2(split_width, split_height))
		# viewport_node.get_node("Viewport").set_size(Vector2(split_width, split_height))
	grid_container.set_size(window_size)
	

func setup_for_cars(players_cars_map):
	players_cars_map_local = players_cars_map
	var num_players = players_cars_map.size()
	if num_players == 0:
		return
	var layout = layouts[num_players]
	var split_width = self.get_node("GridContainer").rect_size.x / layout[0]
	var split_height = self.get_node("GridContainer").rect_size.y / layout[1]
	
	self.get_node("GridContainer").columns = layout[0]

	get_tree().get_root().connect("size_changed", self, "update_viewport_sizes")

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
		players_complete_race[player_name] = false
		

func setup_for_camera_visual_layer(players_layers_map):
	players_camera_visual_layer = players_layers_map

func start_timer(players_cars_map):
	var dynamic_font : DynamicFont = DynamicFont.new()
	dynamic_font.font_data = load("res://resources/fonts/Bungee-Regular.ttf")
	var dynamic_font_2 : DynamicFont = DynamicFont.new()
	dynamic_font_2.font_data = load("res://resources/fonts/Bungee-Regular.ttf")
	var font_standing : DynamicFont = DynamicFont.new()
	font_standing.font_data = load("res://resources/fonts/Bungee-Regular.ttf")
	var font_standing_st : DynamicFont = DynamicFont.new()
	font_standing_st.font_data = load("res://resources/fonts/Bungee-Regular.ttf")
	for player_name in players_cars_map:
		var player_viewport = player_viewports[player_name]
		
		# Countdown
		dynamic_font.size = player_viewport.rect_size.x / 3
		var center = CenterContainer.new()
		var label: Label = Label.new()
		label.text = "3"
		label.add_font_override("font", dynamic_font)
		label.add_color_override("font_color_shadow", Color.black)
		label.add_constant_override("shadow_offset_x",player_viewport.rect_size.x/ 80)
		label.add_constant_override("shadow_offset_y",player_viewport.rect_size.x/ 80)
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
		# time_label.rect_size = player_viewport.rect_size
		time_label.margin_left = player_viewport.rect_size.x / 10
		time_label.margin_right = player_viewport.rect_size.x
		time_label.margin_top = 0
		time_label.margin_bottom = player_viewport.rect_size.y - player_viewport.rect_size.y / 10
		#player_viewport.add_child(time_label)
		player_time_label[player_name] = time_label

		# final Countdown 
		var countdown_label: Label = Label.new()
		countdown_label.text = ""
		countdown_label.visible = false
		countdown_label.add_font_override("font", dynamic_font_2)
		countdown_label.add_color_override("font_color_shadow", Color.black)
		countdown_label.add_constant_override("shadow_offset_x",2)
		countdown_label.add_constant_override("shadow_offset_y",2)
		countdown_label.add_constant_override("shadow_as_outline",0)
		countdown_label.rect_position.x = player_viewport.rect_size.x / 5
		countdown_label.rect_position.y = player_viewport.rect_size.y / 12
		player_viewport.add_child(countdown_label)
		player_countdown_label[player_name] = countdown_label

		# Player name
		var name_label: Label = Label.new()
		name_label.text = Global.player_names[player_name]
		name_label.add_font_override("font", dynamic_font_2)
		name_label.add_color_override("font_color_shadow", Color.black)
		name_label.add_constant_override("shadow_offset_x",2)
		name_label.add_constant_override("shadow_offset_y",2)
		name_label.add_constant_override("shadow_as_outline",0)
		name_label.rect_position.x = player_viewport.rect_size.x - player_viewport.rect_size.x / 5
		name_label.rect_position.y = player_viewport.rect_size.y / 12
		player_viewport.add_child(name_label)
		
		# Round
		var round_count: Label = Label.new()
		round_count.text = "1/3"
		round_count.add_font_override("font", dynamic_font_2)
		round_count.add_color_override("font_color_shadow", Color.black)
		round_count.add_constant_override("shadow_offset_x",2)
		round_count.add_constant_override("shadow_offset_y",2)
		round_count.add_constant_override("shadow_as_outline",0)
		round_count.rect_position.x = player_viewport.rect_size.x / 18
		round_count.rect_position.y = player_viewport.rect_size.y - player_viewport.rect_size.y / 7
		player_viewport.add_child(round_count)
		player_round_label[player_name] = round_count
		
		
		var placement_node = load("res://scenes/utility/PlacementText.tscn").instance()
		placement_node.position = Vector2(player_viewport.rect_size.x / 1920 * 1650,player_viewport.rect_size.x / 1080 * 750)
		player_standing_label[player_name] = placement_node.get_node("NumberLabel")
		player_standing_ending_label[player_name] = placement_node.get_node("EndingLabel")
		player_viewport.add_child(placement_node)
		
		
	timer = Timer.new()
	timer.connect("timeout",self,"_on_timer_timeout") 
	timer.set_wait_time(1) #value is in seconds: 600 seconds = 10 minutes
	timer.set_one_shot(false)
	add_child(timer) 
	timer.start() 
	
func _on_timer_timeout():
	for player_name in players_cars_map_local:
		if(player_label[player_name].text == "EXITED"):
			continue
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

func race_complete(player_id):
	players_complete_race[player_id] = true
	rotate_camera(player_id)
	var time = Global.player_time_to_finish[player_id]
	var ms = fmod(Global.race_time,1)*100
	var seconds = fmod(Global.race_time,60)
	var minutes = fmod(Global.race_time, 3600) / 60
	var str_elapsed = "%02d:%02d:%02d" % [minutes, seconds, ms]
	player_time_label[player_id].text = str_elapsed
	if not is_anyone_complete:
		is_anyone_complete = true
		start_final_countdown()
	else:
		player_label[player_id].visible = false

func start_final_countdown():
	for player_name in players_complete_race:
		if players_complete_race[player_name]:
			continue
		player_countdown_label[player_name].text = str(final_countdown)
		player_countdown_label[player_name].visible = true
		
	timer = Timer.new()
	timer.connect("timeout",self,"_on_timer_final_timeout") 
	timer.set_wait_time(1) #value is in seconds: 600 seconds = 10 minutes
	timer.set_one_shot(false)
	add_child(timer) 
	timer.start() 

func _on_timer_final_timeout():
	for player_name in players_cars_map_local:
		if(player_countdown_label[player_name].visible):
			var last_value = int(player_countdown_label[player_name].text)
			if last_value-1 <= 0:
				player_countdown_label[player_name].visible = false
				timer.stop()
			else:
				player_countdown_label[player_name].text = str(last_value-1)

func exit_player(player_id):
	var dynamic_font : DynamicFont = DynamicFont.new()
	dynamic_font.font_data = load("res://resources/fonts/Bungee-Regular.ttf")
	dynamic_font.size = player_viewports[player_id].rect_size.x / 6
	player_label[player_id].add_font_override("font", dynamic_font)
	player_label[player_id].text = "EXITED"
	player_label[player_id].visible = true

func rotate_camera(player_id):
	var camera =  player_viewports[player_id].get_node("Viewport/Camera")
	camera.set_is_rotate()
	pass
	
	
func update_player_progress(progress):
	var reversed_progress = {}
	for key in progress.keys():
		reversed_progress[progress[key]] = key
	var progress_sorted = reversed_progress.keys()
	progress_sorted.sort()
	progress_sorted.invert()
	var counter = 1
	for progress2 in progress_sorted:
		player_standing_label[reversed_progress[progress2]].text = str(counter)
		if counter < 2:
			player_standing_ending_label[reversed_progress[progress2]].text = 'st'
		elif counter < 3:
			player_standing_ending_label[reversed_progress[progress2]].text = 'nd'
		elif counter < 4:
			player_standing_ending_label[reversed_progress[progress2]].text = 'rd'
		else:
			player_standing_ending_label[reversed_progress[progress2]].text = 'th'
		counter += 1
	


