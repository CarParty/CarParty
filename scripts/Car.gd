extends VehicleBody

############################################################
# behaviour values

export var ENGINE_FORCE = 130.0
export var ENGINE_FORCE_REVERSE = 60.0
export var BRAKE_FORCE = 3.0
export var MAX_STEER_ANGLE = 0.6
# the max target speeds before it's infinity
export var MAX_TARGET_SPEED_FORWARD = 15.0
export var MAX_TARGET_SPEED_REVERSE = 5.0

export var steer_speed = 5.0

var steer_angle = 0.0
var steer_target = 0.0

############################################################
# Input

#export var joy_steering = JOY_ANALOG_LX
#export var steering_mult = -1.0
export var joy_throttle = JOY_ANALOG_R2
export var joy_brake = JOY_ANALOG_L2
var last_input = 0.0

export var follow_length = 1.5

var path: Path = null
var path_follow: PathFollow = null

onready var line_drawer = load("scenes/utility/LineDrawer.tscn").instance()

var color: Color
var material_index = 0

func _ready():
	var material = $CarBody1/CarBody/Body1.get_surface_material(material_index).duplicate()
	material.albedo_color = color
	$CarBody1/CarBody/Body1.set_surface_material(material_index, material)
	brake = 1
	$MotorNoise.playing = true

func set_path(new_path: Path):
	self.path = new_path
	path_follow = PathFollow.new()
	path.add_child(path_follow)
	path_follow.offset = 0.0
	path_follow.loop = true
	path.add_child(line_drawer)
	line_drawer.draw_with_material($CarBody1/CarBody/Body1.get_surface_material(material_index).duplicate())

func set_path_visual_layer(layer):
	line_drawer.set_layer_mask_bit(layer, true)
	line_drawer.set_layer_mask_bit(0, false)
	

func change_speed(value):
	last_input = value

var previous_closest_offset = null
func _physics_process(delta):
	var velocity = self.linear_velocity.length()
	$MotorNoise.pitch_scale = velocity / 15.0 + 1.0
	$MotorNoise.unit_db = velocity / 8.0 + 10.0

	if path_follow == null:
		return

	var forward_velocity = self.get_global_transform().basis.z.dot(self.linear_velocity)
	
	var target_speed = 0.0
	if last_input > 0.95:
		target_speed = 1e10
	elif last_input > 0.0:
		target_speed = MAX_TARGET_SPEED_FORWARD * last_input
	elif last_input < -0.95:
		target_speed = -1e10
	elif last_input < 0.0:
		target_speed = MAX_TARGET_SPEED_REVERSE * last_input
	
	if target_speed > 0 and forward_velocity > -0.5 and target_speed >= forward_velocity:
		engine_force = ENGINE_FORCE
		brake = 0.0
	elif target_speed < 0 and forward_velocity < 0.5 and target_speed < forward_velocity:
		engine_force = -ENGINE_FORCE_REVERSE
		brake = 0.0
	else:
		engine_force = 0.0
		brake = BRAKE_FORCE
		
	
	# compute distance between pathfollow and this
	var projected_translation = Vector2(self.get_global_transform().origin.x, self.get_global_transform().origin.z)
	#print(projected_translation)
	var path_follow_translation = Vector2(path_follow.get_global_transform().origin.x, path_follow.get_global_transform().origin.z)
	#print(path_follow_translation)
	
	var closest_offset = path.curve.get_closest_offset(path.to_local(self.get_global_transform().origin))
	if previous_closest_offset == null:
		previous_closest_offset = closest_offset
	if abs(previous_closest_offset - closest_offset) < 3:
		if engine_force >= -0.5 or forward_velocity > 0:
			path_follow.offset = closest_offset + follow_length
		else:
			path_follow.offset = closest_offset - follow_length
	previous_closest_offset = closest_offset
	
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


func _on_Car_body_entered(_body):
	$ThunkNoise.play()

func honk():
	$HonkNoise.play()
