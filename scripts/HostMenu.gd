extends Control

# Code creation
const ascii_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

var scene_path_to_load

func gen_unique_string(length: int) -> String:
	var result = ""
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	for _i in range(length):
		result += ascii_letters[rng.randi_range(0, ascii_letters.length()-1)]
	return result

func _ready():
	# guess key until we have a valid one
	Global.key = gen_unique_string(4)
	# QR Code
	load_qr_code()
	$HTTPRequest.connect("request_completed", self, "_qrcode_request_completed")
	$MarginContainer/VBoxContainer2/HBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/Gamecode.text = Global.key
	
	Client.connect_to_url()	
	
func load_qr_code():
	$HTTPRequest.request("https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&color=263138&data=https://xn--bci0938m.ml/")


func _qrcode_request_completed(result, response_code, _headers, body):
	if response_code == 200:
		var image = Image.new()
		var image_error = image.load_png_from_buffer(body)
		if image_error != OK:
			print("Error in image download:", result, response_code)
		var texture = ImageTexture.new()
		texture.create_from_image(image)
		$MarginContainer/VBoxContainer2/HBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/TextureRect.texture = texture
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
	Client.reset_connection()
	Global.goto_scene("res://scenes/StartMenu.tscn")
	
	
func _on_StartButton_pressed():
	scene_path_to_load = "res://scenes/Game.tscn"
	$FadeIn.show()
	$FadeIn.fade_in()
	
func _on_FadeIn_fade_finished():
	if scene_path_to_load == "res://scenes/Game.tscn":
		print("Racing phase started.")
		Client.start_phase_global("racing")
	Global.goto_scene(scene_path_to_load)


func _on_HostMenu_tree_exited():
	pass


# websocket stuff below
func _process(_delta):
	$MarginContainer/VBoxContainer2/HBoxContainer2/VBoxContainer/CenterContainer3/HBoxContainer/PlayerAmountNumber.text = str(Global.clients.size())



