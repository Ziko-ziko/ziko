"""Blender 3D motion-graphics example: extruded 3D text that spins in.

Run (headless):
  blender -b --python scripts/blender_text3d.py -- "ZIKO" out/blender-text.mp4 [scale%]

Uses Cycles on CPU (works on servers without a GPU). On your own PC with a GPU
you can switch ENGINE to "BLENDER_EEVEE" for much faster renders.
"""
import math
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
TEXT = argv[0] if len(argv) > 0 else "ZIKO"
OUT = argv[1] if len(argv) > 1 else "out/blender-text.mp4"
SCALE = int(argv[2]) if len(argv) > 2 else 50
ENGINE = "CYCLES"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 1, 72
scene.render.fps = 24

# Text
bpy.ops.object.text_add(location=(0, 0, 0))
txt = bpy.context.object
txt.data.body = TEXT
txt.data.align_x = "CENTER"
txt.data.align_y = "CENTER"
txt.data.extrude = 0.15
txt.data.bevel_depth = 0.02
mat = bpy.data.materials.new("Accent")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (1.0, 0.24, 0.43, 1)
bsdf.inputs["Metallic"].default_value = 0.6
bsdf.inputs["Roughness"].default_value = 0.25
txt.data.materials.append(mat)

# Spin-in animation
txt.rotation_euler = (math.radians(90), 0, math.radians(-180))
txt.scale = (0.01, 0.01, 0.01)
txt.keyframe_insert("rotation_euler", frame=1)
txt.keyframe_insert("scale", frame=1)
txt.rotation_euler = (math.radians(90), 0, 0)
txt.scale = (1, 1, 1)
txt.keyframe_insert("rotation_euler", frame=40)
txt.keyframe_insert("scale", frame=40)

# Camera + lights + world
bpy.ops.object.camera_add(location=(0, -7, 0.4), rotation=(math.radians(88), 0, 0))
scene.camera = bpy.context.object
bpy.ops.object.light_add(type="AREA", location=(3, -4, 4))
bpy.context.object.data.energy = 800
bpy.ops.object.light_add(type="AREA", location=(-4, -2, -1))
bpy.context.object.data.energy = 300
world = bpy.data.worlds.new("World")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.02, 0.02, 0.05, 1)
scene.world = world

# Render settings
scene.render.engine = ENGINE
if ENGINE == "CYCLES":
    scene.cycles.device = "CPU"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.resolution_percentage = SCALE
scene.render.image_settings.file_format = "FFMPEG"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = "HIGH"
scene.render.filepath = OUT
bpy.ops.render.render(animation=True)
