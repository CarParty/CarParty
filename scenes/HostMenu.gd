extends Control

# Code creation
const ascii_letters_and_digits = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# QR-Code
const QR_CODE_PATH_OS = "resources\\qrcode\\code.png"
const QR_CODE_PATH_GODOT = "res://resources/qrcode/code.png"
const QR_CODE_FOLDER_GODOT = "res://resources/qrcode"
const ZINT_BINARY_OS = "resources\\qrcode\\zint"


func gen_unique_string(length: int) -> String:
	var result = ""
	for _i in range(length):
		result += ascii_letters_and_digits[randi() % ascii_letters_and_digits.length()]
	return result

func _ready():
	# guess key until we have a valid one
	var key = gen_unique_string(6)
	# TODO: connect to websocket and stuff with the key
	load_qr_code()
	
	$MarginContainer/VBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/Gamecode.text = key
	
func load_qr_code():
	OS.execute(ZINT_BINARY_OS, ["-d", "https://www.google.com", "-b", "58", "-o", QR_CODE_PATH_OS, "--scale", "4"], false)
	var image
	var importer = Directory.new()
	while image == null:
		if importer.open(QR_CODE_FOLDER_GODOT) == OK:
			importer.list_dir_begin()
			var file_name = importer.get_next()
			while(file_name != ""):
				if file_name.ends_with(".png"):
					image = load(QR_CODE_PATH_GODOT)
				file_name = importer.get_next()
			importer.list_dir_end()
	#var texture = get_resized_texture(image, 200, 200)
	$MarginContainer/VBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/TextureRect.texture = image
	
func get_resized_texture(t: Texture, width: int = 0, height: int = 0):
	var image = t.get_data()
	if width > 0 && height > 0:
		image.resize(width, height)
	var itex = ImageTexture.new()
	itex.create_from_image(image)
	return itex

func _on_BackButton_pressed():
	get_tree().change_scene("res://scenes/StartMenu.tscn")
	
func _on_StartButton_pressed():
	get_tree().change_scene("res://scenes/Game.tscn")


func _on_HostMenu_tree_exited():
	# TODO: on exit close websocket and stuff
	var dir = Directory.new()
	dir.remove(QR_CODE_PATH_GODOT)
	pass

# TODO: check for player connections and set number of players connected


