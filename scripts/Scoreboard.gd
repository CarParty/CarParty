extends Control


# Declare member variables here. Examples:
# var a = 2
# var b = "text"


# Called when the node enters the scene tree for the first time.
func _ready():
	for client in Global.clients:
		var center = CenterContainer.new()
		var label = Label.new()
		label.text = Global.player_names[client]
		center.size_flags_vertical = 3
		center.add_child(label)
		$MarginContainer/VBoxContainer.add_child(center)


# Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
#	pass
