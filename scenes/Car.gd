extends VehicleBody

############################################################
# behaviour values

export var MAX_ENGINE_FORCE = 400.0
export var MAX_BRAKE_FORCE = 5.0
export var MAX_STEER_ANGLE = 30

export var steer_speed = 5.0

var steer_angle = 0.0
var steer_target = 0.0

############################################################
# Input

#export var joy_steering = JOY_ANALOG_LX
#export var steering_mult = -1.0
export var joy_throttle = JOY_ANALOG_R2
export var throttle_mult = 1.0
export var joy_brake = JOY_ANALOG_L2
export var brake_mult = 1.0

onready var path = get_parent().get_node("Path")
onready var path_follow = PathFollow.new()

func _ready():
	path.add_child(path_follow)

func _physics_process(delta):
	# overrules for keyboard
	var throttle_val = 0.0
	var brake_val = 0.0
	if Input.is_action_pressed("ui_up"):
		throttle_val = 1.0
	if Input.is_action_pressed("ui_down"):
		brake_val = 1.0
		
	engine_force = throttle_val * MAX_ENGINE_FORCE
	brake = brake_val * MAX_BRAKE_FORCE
	
	# compute distance between pathfollow and this
	var projected_translation = Vector2(self.translation.x, self.translation.z)
	#print(projected_translation)
	var path_follow_translation = Vector2(path_follow.translation.x, path_follow.translation.z)
	#print(path_follow_translation)
	var own_normal = Vector2(self.transform.basis.z.x, self.transform.basis.z.z)
	print("own normal", own_normal)
	var delta_vec = (path_follow_translation - projected_translation).normalized()
	print("path follow - own", delta_vec)
	var angle = -own_normal.angle_to(delta_vec)
	print("angle", angle)
	var steer_target = angle
	if (steer_target < steer_angle):
		steer_angle -= steer_speed * delta
		if (steer_target > steer_angle):
			steer_angle = steer_target
	elif (steer_target > steer_angle):
		steer_angle += steer_speed * delta
		if (steer_target < steer_angle):
			steer_angle = steer_target
	
	steering = steer_angle
