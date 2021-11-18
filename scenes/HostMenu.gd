extends Control

# Code creation
const ascii_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# QR-Code
const QR_CODE_PATH_OS = "resources\\qrcode\\code.png"
const QR_CODE_PATH_GODOT = "res://resources/qrcode/code.png"
const QR_CODE_FOLDER_GODOT = "res://resources/qrcode"
const ZINT_BINARY_OS = "resources\\qrcode\\zint"


func gen_unique_string(length: int) -> String:
	var result = ""
	for _i in range(length):
		result += ascii_letters[randi() % ascii_letters.length()]
	return result

func _ready():
	randomize()
	# guess key until we have a valid one
	var key = gen_unique_string(4)
	# TODO: connect to websocket and stuff with the key
	load_qr_code()
	
	$HTTPRequest.connect("request_completed", self, "_qrcode_request_completed")
	
	$MarginContainer/VBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/Gamecode.text = key
	
func load_qr_code():
	$HTTPRequest.request("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://google.com")
	#var texture = get_resized_texture(image, 200, 200)


func _qrcode_request_completed(result, response_code, headers, body):
	if response_code == 200:
		var image = Image.new()
		var image_error = image.load_png_from_buffer(body)
		if image_error != OK:
			print("Error in image download:", result, response_code)
		var texture = ImageTexture.new()
		texture.create_from_image(image)
		$MarginContainer/VBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/TextureRect.texture = texture
	else:
		print("Error in HTTP Request:", result, response_code)

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


