extends Camera


var target: Object
export var smooth_speed: float
export var offset: Vector3

func _ready():
	set_physics_process(true)
	set_as_toplevel(true)
	target = get_parent().get_node("CameraTarget")
	smooth_speed = 7
	offset = Vector3(0,1.5,-3)
	

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _physics_process(delta: float) -> void:
	if(target != null):
		self.transform.origin = lerp(self.transform.origin, target.transform.origin+offset, smooth_speed * delta)
		self.rotation = target.rotation
