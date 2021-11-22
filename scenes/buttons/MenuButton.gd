extends Button

export(String) var scene_to_load

func _ready():
	rect_min_size.x = get_viewport_rect().size.x / 3
	rect_min_size.y = get_viewport_rect().size.y / 10
