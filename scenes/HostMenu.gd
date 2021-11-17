extends Control

var ascii_letters_and_digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func gen_unique_string(length: int) -> String:
	var result = ""
	for _i in range(length):
		result += ascii_letters_and_digits[randi() % ascii_letters_and_digits.length()]
	return result

func _ready():
	# guess key until we have a valid one
	var key = gen_unique_string(6)
	# TODO: connect to websocket and stuff with the key
	
	$MarginContainer/VBoxContainer/CenterContainer2/Gamecode.text = key

func _on_BackButton_pressed():
	get_tree().change_scene("res://scenes/StartMenu.tscn")


func _on_HostMenu_tree_exited():
	# TODO: on exit close websocket and stuff
	pass
