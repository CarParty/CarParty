extends VehicleBody

############################################################
# behaviour values

export var MAX_ENGINE_FORCE = 250.0
export var MAX_BRAKE_FORCE = 5.0
export var MAX_STEER_ANGLE = 0.6

export var steer_speed = 5.0

var steer_angle = 0.0
var steer_target = 0.0

############################################################
# Input

#export var joy_steering = JOY_ANALOG_LX
#export var steering_mult = -1.0
export var joy_throttle = JOY_ANALOG_R2
export var throttle_mult = 0
export var joy_brake = JOY_ANALOG_L2
export var brake_mult = 0

export var follow_length = 1.5

onready var path = get_parent().get_node("Path")
onready var path_follow = PathFollow.new()

onready var debug_sphere = load("scenes/DebugSphere.tscn").instance()

func _ready():
	path.add_child(path_follow)
	path_follow.offset = 0.0
	path_follow.loop = true
	path_follow.add_child(debug_sphere)
	
	randomize()
	var color = Color.from_hsv(randf(), .7, .79)
	var material = $CarBody1/CarBody/Body1.get_surface_material(0).duplicate()
	material.albedo_color = color
	$CarBody1/CarBody/Body1.set_surface_material(0, material)

func change_speed(value):
	if value+Global.epsilon >= throttle_mult:
		throttle_mult = value
		brake_mult = 0
	else:
		if (self.transform.basis * self.linear_velocity).z < 0.7:
			brake_mult = 0.0
			throttle_mult = -0.5
		else:
			brake_mult = 1.0

func _physics_process(delta):
		
	engine_force = throttle_mult * MAX_ENGINE_FORCE
	brake = brake_mult * MAX_BRAKE_FORCE
	
	# compute distance between pathfollow and this
	var projected_translation = Vector2(self.get_global_transform().origin.x, self.get_global_transform().origin.z)
	#print(projected_translation)
	var path_follow_translation = Vector2(path_follow.get_global_transform().origin.x, path_follow.get_global_transform().origin.z)
	#print(path_follow_translation)
	
	var closest_offset = path.curve.get_closest_offset(path.to_local(self.get_global_transform().origin))
	
	if engine_force >= -0.5:
		path_follow.offset = closest_offset + follow_length
	else:
		path_follow.offset = closest_offset - follow_length
	
	# move ahead the pathfollow
	#while (path_follow_translation - projected_translation).length() < follow_length:
	#	path_follow.offset += 0.05
	#	path_follow_translation = Vector2(path_follow.get_global_transform().origin.x, path_follow.get_global_transform().origin.z)
	
	var own_normal = Vector2(self.transform.basis.z.x, self.transform.basis.z.z)
	
	#print("own normal", own_normal)
	var delta_vec = (path_follow_translation - projected_translation).normalized()
	#print("path follow - own", delta_vec)
	var angle = -own_normal.angle_to(delta_vec)
	

	
	#print("angle", angle)
	steer_target = angle
	if steer_target < steer_angle and steer_angle > -MAX_STEER_ANGLE:
		steer_angle -= steer_speed * delta
		if steer_target > steer_angle:
			steer_angle = steer_target
	elif steer_target > steer_angle and steer_angle < MAX_STEER_ANGLE:
		steer_angle += steer_speed * delta
		if (steer_target < steer_angle):
			steer_angle = steer_target
	steer_angle = min(MAX_STEER_ANGLE, steer_angle)
	steer_angle = max(-MAX_STEER_ANGLE, steer_angle)
	steering = steer_angle
