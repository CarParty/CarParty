extends Control


# Declare member variables here. Examples:
# var a = 2
# var b = "text"


# Called when the node enters the scene tree for the first time.
func _ready():
	Client.start_phase_global("ending")
	
	var dynamic_font = DynamicFont.new()
	dynamic_font.font_data = load("res://resources/fonts/Clickuper.ttf")
	dynamic_font.size = 50
	
	
	for client in Global.clients:
		var center = CenterContainer.new()
		var label = Label.new()
		label.text = Global.player_names[client] + ": " + _time_to_string(Global.player_time_to_finish[client])
		label.add_font_override("font", dynamic_font)
		center.size_flags_vertical = 3
		center.add_child(label)
		$MarginContainer/VBoxContainer.add_child(center)

func _time_to_string(time):
	var ms = fmod(time,1)*100
	var seconds = fmod(time,60)
	var minutes = fmod(time, 3600) / 60
	var str_elapsed = "%02d:%02d:%02d" % [minutes, seconds, ms]
	return str_elapsed


# Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
#	pass
