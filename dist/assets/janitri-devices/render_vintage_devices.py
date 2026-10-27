"""Render the Janitri device concepts as authored Blender 3D assets.

Run with Blender's background Python interpreter. The scene and every render are
kept together so the product mockups can be revised from real geometry later.
"""

import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = ROOT

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != "Collection":
        bpy.data.collections.remove(collection)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "AgX"
scene.render.resolution_x = 2048
scene.render.resolution_y = 1536
scene.render.image_settings.color_depth = "8"
scene.world.color = (0.22, 0.22, 0.22)

def material(name, color, metallic=0.0, roughness=0.35, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Metallic"].default_value = metallic
    node.inputs["Roughness"].default_value = roughness
    if emission:
        node.inputs["Emission Color"].default_value = (*color, 1)
        node.inputs["Emission Strength"].default_value = emission
    return mat

MAT = {
    "alloy": material("Warm champagne anodized alloy", (0.48, 0.35, 0.23), 0.82, 0.22),
    "ivory": material("Vintage warm ivory enamel", (0.82, 0.75, 0.62), 0.24, 0.24),
    "walnut": material("Oiled walnut veneer", (0.24, 0.105, 0.047), 0.08, 0.32),
    "brass": material("Brushed aged brass", (0.58, 0.37, 0.15), 0.78, 0.27),
    "graphite": material("Soft graphite ceramic", (0.025, 0.032, 0.039), 0.62, 0.24),
    "glass": material("Smoked display glass", (0.012, 0.02, 0.024), 0.18, 0.12),
    "paper": material("Warm porcelain interface", (0.91, 0.86, 0.78), 0.0, 0.68, 0.12),
    "paper2": material("Pale blush interface", (0.82, 0.72, 0.64), 0.0, 0.62, 0.08),
    "ink": material("Ink interface", (0.055, 0.075, 0.084), 0.0, 0.7, 0.1),
    "muted": material("Secondary interface text", (0.31, 0.33, 0.31), 0.0, 0.6, 0.08),
    "coral": material("Janitri terracotta accent", (0.74, 0.28, 0.19), 0.05, 0.36, 0.22),
    "teal": material("Clinical teal", (0.12, 0.42, 0.4), 0.08, 0.35, 0.25),
    "blue": material("Monitoring blue", (0.19, 0.39, 0.62), 0.08, 0.34, 0.25),
    "green": material("Care status green", (0.3, 0.5, 0.35), 0.0, 0.4, 0.2),
    "gold": material("Warm status gold", (0.78, 0.53, 0.2), 0.05, 0.4, 0.18),
    "white": material("LED porcelain", (0.96, 0.93, 0.87), 0.0, 0.45, 0.35),
}

# A restrained procedural grain gives the wood real surface variation and
# exports as a compact PBR material in the GLB files.
wood_nodes = MAT["walnut"].node_tree.nodes
wood_links = MAT["walnut"].node_tree.links
wood_bsdf = wood_nodes.get("Principled BSDF")
wood_noise = wood_nodes.new("ShaderNodeTexNoise")
wood_noise.inputs["Scale"].default_value = 3.8
wood_noise.inputs["Detail"].default_value = 3.0
wood_noise.inputs["Roughness"].default_value = 0.72
wood_wave = wood_nodes.new("ShaderNodeTexWave")
wood_wave.wave_type = "BANDS"
wood_wave.bands_direction = "X"
wood_wave.inputs["Scale"].default_value = 7.0
wood_wave.inputs["Distortion"].default_value = 5.0
wood_ramp = wood_nodes.new("ShaderNodeValToRGB")
wood_ramp.color_ramp.elements[0].position = 0.22
wood_ramp.color_ramp.elements[0].color = (0.075, 0.027, 0.012, 1)
wood_ramp.color_ramp.elements[1].position = 0.82
wood_ramp.color_ramp.elements[1].color = (0.35, 0.16, 0.065, 1)
wood_links.new(wood_noise.outputs["Fac"], wood_wave.inputs["Distortion"])
wood_links.new(wood_wave.outputs["Color"], wood_ramp.inputs["Fac"])
wood_links.new(wood_ramp.outputs["Color"], wood_bsdf.inputs["Base Color"])
wood_bump = wood_nodes.new("ShaderNodeBump")
wood_bump.inputs["Strength"].default_value = 0.12
wood_bump.inputs["Distance"].default_value = 0.035
wood_links.new(wood_wave.outputs["Color"], wood_bump.inputs["Height"])
wood_links.new(wood_bump.outputs["Normal"], wood_bsdf.inputs["Normal"])

# A real packed bitmap keeps the veneer grain visible in both Blender renders
# and exported glTF materials instead of depending on procedural-only shaders.
wood_image = bpy.data.images.new("Janitri vintage walnut grain", width=512, height=512, alpha=False)
pixels = [0.0] * (512 * 512 * 4)
for py in range(512):
    for px in range(512):
        grain = (math.sin(py * .11 + math.sin(px * .017) * 2.1) * .5 + .5)
        fleck = (math.sin(px * .23 + py * .037) * .5 + .5) * .10
        shade = max(0.0, min(1.0, .20 + grain * .55 + fleck))
        i = (py * 512 + px) * 4
        pixels[i:i+4] = (.075 + shade*.28, .027 + shade*.13, .012 + shade*.065, 1.0)
wood_image.pixels[:] = pixels
wood_image.filepath_raw = os.path.join(OUT, "vintage-walnut-grain.png")
wood_image.file_format = "PNG"
wood_image.save()
wood_image.pack()
wood_tex = wood_nodes.new("ShaderNodeTexImage")
wood_tex.name = "Packed walnut veneer texture"
wood_tex.image = wood_image
wood_uv = wood_nodes.new("ShaderNodeTexCoord")
wood_links.new(wood_uv.outputs["UV"], wood_tex.inputs["Vector"])
wood_links.new(wood_tex.outputs["Color"], wood_bsdf.inputs["Base Color"])

def make_collection(name):
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    return col

active_col = None
def move_to_collection(obj):
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    active_col.objects.link(obj)
    return obj

def bevel_box(name, location, size, mat, bevel=0.08, segments=5):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to_collection(obj)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Precision radiused device edges", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.profile = 0.5
        obj.modifiers.new("Clean weighted highlights", "WEIGHTED_NORMAL")
    return obj

def add_text(name, body, x, z, y, size, mat, align="LEFT"):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.align_x = align
    curve.extrude = 0
    curve.bevel_depth = 0
    obj = bpy.data.objects.new(name, curve)
    active_col.objects.link(obj)
    obj.location = (x, y, z)
    obj.rotation_euler = (math.radians(90), 0, 0)
    curve.materials.append(mat)
    return obj

def face_panel(name, x, z, w, h, y, mat, radius=0.035):
    return bevel_box(name, (x, y, z), (w, 0.012, h), mat, radius, 4)

def line(name, x1, z1, x2, z2, y, mat, thickness=0.013):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = thickness
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(1)
    spline.points[0].co = (x1, y, z1, 1)
    spline.points[1].co = (x2, y, z2, 1)
    obj = bpy.data.objects.new(name, curve)
    active_col.objects.link(obj)
    curve.materials.append(mat)
    return obj

def waveform(name, x, z, width, height, y, mat, phase=0):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = 0.012
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    count = 56
    spline.points.add(count - 1)
    for i in range(count):
        t = i / (count - 1)
        # A readable clinical trace with a distinct QRS-like peak each cycle.
        pulse = math.exp(-((t * 5.5 % 1 - 0.48) / 0.065) ** 2) * 0.78
        base = math.sin((t * 5.5 + phase) * math.tau) * 0.10
        zz = z + height * (base + pulse)
        spline.points[i].co = (x + width * t, y, zz, 1)
    obj = bpy.data.objects.new(name, curve)
    active_col.objects.link(obj)
    curve.materials.append(mat)
    return obj

def monitor_ui(w, h, prefix, clinical=False, screen_y=-.105):
    # Screen face lies at y=-0.11, with interface pieces on top of the glass.
    face_panel(prefix + " · interface canvas", 0, 0, w, h, screen_y, MAT["paper"], 0.025)
    top = h * 0.19
    face_panel(prefix + " · app bar", 0, h * .405, w * .98, top, screen_y - .011, MAT["ink"], .025)
    add_text(prefix + " · wordmark", "janitri", -w*.45, h*.39, screen_y-.025, h*.078, MAT["white"])
    add_text(prefix + " · page title", "Care overview" if clinical else "Maternal care", -w*.28, h*.39, screen_y-.025, h*.052, MAT["white"])
    # Care navigation rail.
    face_panel(prefix + " · navigation", -w*.425, -h*.10, w*.13, h*.74, screen_y-.012, MAT["paper2"], .025)
    for i, label in enumerate(["Overview", "Patients", "Monitoring", "Reports"]):
        z = h*.20 - i*h*.13
        face_panel(prefix + " · nav marker " + str(i), -w*.46, z, w*.018, h*.045, screen_y-.026, MAT["coral"] if i == 0 else MAT["muted"], .012)
        add_text(prefix + " · nav " + str(i), label, -w*.435, z-h*.018, screen_y-.03, h*.032, MAT["ink"] if i==0 else MAT["muted"])
    # Three clear information panels, with readable traces on the main panel.
    main_x, main_w = -w*.12, w*.48
    face_panel(prefix + " · patient panel", main_x, h*.16, main_w, h*.35, screen_y-.014, MAT["white"], .04)
    add_text(prefix + " · patient heading", "Maternal care" if not clinical else "Neonatal monitoring", main_x-main_w*.44, h*.245, screen_y-.032, h*.045, MAT["ink"])
    add_text(prefix + " · patient subheading", "Care plan · today" if not clinical else "NICU · live overview", main_x-main_w*.44, h*.18, screen_y-.032, h*.033, MAT["muted"])
    waveform(prefix + " · care trace", main_x-main_w*.41, h*.045, main_w*.82, h*.11, screen_y-.035, MAT["teal"] if not clinical else MAT["coral"])
    panel_x = w*.325
    face_panel(prefix + " · status panel", panel_x, h*.16, w*.19, h*.35, screen_y-.014, MAT["white"], .04)
    add_text(prefix + " · status heading", "Care status", panel_x-w*.07, h*.24, screen_y-.032, h*.04, MAT["ink"])
    add_text(prefix + " · status value", "On track" if not clinical else "4 beds", panel_x-w*.07, h*.125, screen_y-.032, h*.06, MAT["teal"])
    for i in range(3):
        px = -w*.12 + i*w*.235
        face_panel(prefix + " · summary " + str(i), px, -h*.22, w*.205, h*.27, screen_y-.014, MAT["white"], .035)
        accent = [MAT["coral"], MAT["teal"], MAT["gold"]][i]
        face_panel(prefix + " · summary chip " + str(i), px-w*.067, -h*.16, w*.036, h*.043, screen_y-.035, accent, .018)
        add_text(prefix + " · summary label " + str(i), ["Visits", "Checks", "Alerts"][i], px-w*.043, -h*.155, screen_y-.036, h*.03, MAT["muted"])
        add_text(prefix + " · summary number " + str(i), ["08", "14", "02"][i], px-w*.075, -h*.235, screen_y-.036, h*.055, MAT["ink"])
    # Tiny ambient status lights on the top rail.
    for i, c in enumerate([MAT["coral"], MAT["gold"], MAT["green"]]):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=h*.017, location=(w*.39+i*w*.035, screen_y-.032, h*.405))
        obj = move_to_collection(bpy.context.object)
        obj.name = prefix + " · status light " + str(i)
        obj.data.materials.append(c)

def create_tablet():
    global active_col
    active_col = make_collection("DEVICE 01 · Maternal care tablet")
    bevel_box("Tablet · champagne unibody", (0, 0, 0), (3.85, .16, 2.62), MAT["alloy"], .18, 8)
    bevel_box("Tablet · graphite inner bezel", (0, -.088, 0), (3.69, .035, 2.47), MAT["graphite"], .135, 8)
    bevel_box("Tablet · walnut folio spine", (-1.88, -.006, 0), (.16, .19, 2.52), MAT["walnut"], .07, 7)
    bevel_box("Tablet · brass folio latch", (-1.88, -.11, -.72), (.11, .035, .25), MAT["brass"], .035, 6)
    # Screen dimensions and UI components follow the visible glass plane.
    monitor_ui(3.48, 2.23, "Tablet", False)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=.035, location=(1.79, -.125, 0))
    obj = move_to_collection(bpy.context.object); obj.name = "Tablet · front camera"; obj.data.materials.append(MAT["teal"])

def create_phone():
    global active_col
    active_col = make_collection("DEVICE 02 · Mothers care phone")
    bevel_box("Phone · ivory enamel side rail", (0, 0, 0), (1.55, .15, 2.96), MAT["ivory"], .22, 10)
    bevel_box("Phone · brass edge inlay", (0, -.079, 0), (1.49, .012, 2.90), MAT["brass"], .195, 9)
    bevel_box("Phone · graphite glass surround", (0, -.083, 0), (1.47, .035, 2.87), MAT["graphite"], .19, 9)
    face_panel("Phone · display", 0, 0, 1.34, 2.70, -.105, MAT["paper"], .14)
    face_panel("Phone · status header", 0, 1.08, 1.29, .44, -.118, MAT["ink"], .10)
    add_text("Phone · brand", "janitri", -.52, 1.13, -.135, .16, MAT["white"])
    add_text("Phone · screen title", "Your pregnancy", -.51, .73, -.136, .105, MAT["ink"])
    add_text("Phone · screen subtitle", "Week 24 · Your care", -.51, .55, -.136, .072, MAT["muted"])
    face_panel("Phone · journey card", 0, .10, 1.10, .68, -.12, MAT["white"], .08)
    face_panel("Phone · journey icon", -.37, .10, .20, .20, -.145, MAT["coral"], .065)
    add_text("Phone · journey title", "Your journey", -.19, .15, -.149, .09, MAT["ink"])
    add_text("Phone · journey detail", "A little more each day", -.19, -.01, -.149, .058, MAT["muted"])
    face_panel("Phone · next step card", 0, -.64, 1.10, .62, -.12, MAT["white"], .08)
    add_text("Phone · next step title", "Next appointment", -.49, -.51, -.149, .082, MAT["ink"])
    add_text("Phone · next step detail", "Thursday · 10:30 am", -.49, -.67, -.149, .062, MAT["muted"])
    waveform("Phone · calm care trace", -.43, -.94, .86, .12, -.149, MAT["teal"], .2)
    face_panel("Phone · home indicator", 0, -1.30, .42, .035, -.14, MAT["ink"], .014)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=.035, location=(0, -.14, 1.31))
    obj = move_to_collection(bpy.context.object); obj.name = "Phone · camera island"; obj.data.materials.append(MAT["graphite"])

def create_desktop():
    global active_col
    active_col = make_collection("DEVICE 03 · Neonatal desktop")
    bevel_box("Desktop · walnut rear cabinet", (0, 0, .55), (3.82, .22, 2.54), MAT["walnut"], .18, 8)
    bevel_box("Desktop · ivory enamel face", (0, -.113, .55), (3.74, .035, 2.46), MAT["ivory"], .14, 7)
    bevel_box("Desktop · champagne trim", (0, -.136, .55), (3.61, .018, 2.33), MAT["brass"], .115, 7)
    bevel_box("Desktop · graphite screen bezel", (0, -.15, .55), (3.51, .02, 2.23), MAT["graphite"], .105, 7)
    # Full browser-style clinical dashboard, on the display's Z-centered frame.
    active_col.objects[-1].location.z = .55
    before_ui = len(active_col.objects)
    monitor_ui(3.43, 2.16, "Desktop neonatal", True, screen_y=-.18)
    # Center every dashboard layer on the raised monitor panel, not the stand.
    for obj in list(active_col.objects)[before_ui:]:
        obj.location.z += .55
    bevel_box("Desktop · sculpted stand neck", (0, .06, -.87), (.39, .18, .96), MAT["ivory"], .11, 6)
    bevel_box("Desktop · weighted foot", (0, -.02, -1.39), (1.58, .74, .13), MAT["walnut"], .09, 7)
    bevel_box("Desktop · front chin highlight", (0, -.115, -.64), (.30, .025, .035), MAT["alloy"], .016, 4)
    # Tactile compact keyboard, sized to the device footprint, with separate
    # ivory keycaps and walnut deck so dimensions read correctly in 3D.
    bevel_box("Desktop · keyboard deck", (0, -.39, -1.53), (2.15, .58, .12), MAT["walnut"], .075, 6)
    for row, count in enumerate((13, 13, 11)):
        key_w = 1.94 / count
        for col in range(count):
            x = -.97 + key_w * (col + .5) + (row * .018)
            y = -.22 - row * .16
            bevel_box(f"Desktop · key {row}-{col}", (x, y, -1.43), (key_w*.76, .11, .035), MAT["ivory"], .018, 3)
    bevel_box("Desktop · space bar", (0, -.62, -1.43), (.66, .13, .035), MAT["ivory"], .018, 3)

def create_tv():
    global active_col
    active_col = make_collection("DEVICE 04 · Central monitoring TV")
    bevel_box("CMS TV · sculpted walnut cabinet", (0, 0, 0), (4.80, .26, 2.86), MAT["walnut"], .2, 10)
    bevel_box("CMS TV · ivory enamel face", (0, -.135, 0), (4.66, .035, 2.72), MAT["ivory"], .17, 9)
    bevel_box("CMS TV · brushed brass inner lip", (0, -.158, 0), (4.56, .018, 2.62), MAT["brass"], .145, 8)
    bevel_box("CMS TV · graphite glass bezel", (0, -.174, 0), (4.46, .02, 2.52), MAT["graphite"], .12, 8)
    # CMS replaces the broad screen UI with a dedicated multi-bed monitor layout.
    wy = -.19
    face_panel("CMS · dashboard canvas", 0, 0, 4.04, 2.40, wy, MAT["ink"], .025)
    face_panel("CMS · top command bar", 0, 1.035, 3.98, .28, wy-.012, MAT["graphite"], .02)
    add_text("CMS · title", "JANITRI  /  CENTRAL MONITORING", -1.88, 1.005, wy-.03, .115, MAT["white"])
    add_text("CMS · live status", "LIVE  ·  04 BEDS", 1.35, 1.005, wy-.03, .085, MAT["teal"])
    # Four bed panels with live traces and distinct status states.
    for i in range(4):
        col = i % 2; row = i // 2
        x = -.96 + col * 1.92
        z = .43 - row * .90
        face_panel("CMS · patient bay " + str(i+1), x, z, 1.78, .78, wy-.014, MAT["graphite"], .045)
        add_text("CMS · bed label " + str(i+1), "BED 0" + str(i+1), x-.78, z+.26, wy-.036, .085, MAT["white"])
        add_text("CMS · patient status " + str(i+1), ["Stable", "Review", "Stable", "Watch"][i], x+.15, z+.26, wy-.036, .067, [MAT["teal"], MAT["gold"], MAT["teal"], MAT["coral"]][i])
        waveform("CMS · ECG " + str(i+1), x-.76, z-.04, 1.52, .20, wy-.04, [MAT["teal"], MAT["gold"], MAT["blue"], MAT["coral"]][i], i*.13)
    # The vintage control bank reads as a real physical side panel, not screen UI.
    for idx, z in enumerate((.70, .15, -.40)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=.16 if idx < 2 else .10, depth=.09, location=(2.22, -.18, z), rotation=(math.radians(90), 0, 0))
        knob = move_to_collection(bpy.context.object)
        knob.name = f"CMS TV · brass control {idx+1}"
        knob.data.materials.append(MAT["brass"])
        bevel = knob.modifiers.new("Rounded tactile knob", "BEVEL")
        bevel.width = .025
        bevel.segments = 4
        knob.modifiers.new("Control weighted normals", "WEIGHTED_NORMAL")
    # A small physical power light on the lower right bezel.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=.035, location=(2.02, -.14, -1.25))
    obj = move_to_collection(bpy.context.object); obj.name = "CMS TV · power light"; obj.data.materials.append(MAT["teal"])

create_tablet()
create_phone()
create_desktop()
create_tv()

# Give the physical veneer pieces usable UVs for the packed texture.
for obj in [o for o in scene.objects if o.type == "MESH" and MAT["walnut"] in o.data.materials[:]]:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(island_margin=0.025)
    bpy.ops.object.mode_set(mode="OBJECT")

# Studio camera and softboxes reveal rounded edges, metal trim and screen depth.
def track(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

bpy.ops.object.camera_add(location=(4.0, -9.2, 3.25))
camera = bpy.context.object
camera.name = "Product render camera · three-quarter"
track(camera, (0, 0, 0))
scene.camera = camera
camera.data.type = "ORTHO"
camera.data.ortho_scale = 5.15

def area(name, location, power, size, color):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    track(light, (0, 0, 0))
    return light

area("Key softbox · warm ivory", (-4.3, -5.0, 6.2), 720, 5.0, (1.0, .84, .69))
area("Fill softbox · neutral", (4.5, -3.0, 2.8), 460, 4.0, (.76, .86, 1.0))
area("Rim softbox · edge glint", (1.2, 3.6, 4.8), 850, 3.5, (1.0, .69, .46))
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True
scene.render.filepath = os.path.join(OUT, "blender-tablet.png")

# Keep scene assets in place as a product lineup, and render each collection in
# a clean individual transparent plate for the existing scroll choreography.
device_collections = [bpy.data.collections.get(name) for name in [
    "DEVICE 01 · Maternal care tablet",
    "DEVICE 02 · Mothers care phone",
    "DEVICE 03 · Neonatal desktop",
    "DEVICE 04 · Central monitoring TV",
]]
camera.data.dof.use_dof = False
for index, col in enumerate(device_collections):
    for other in device_collections:
        other.hide_render = (other != col)
    scene.render.resolution_x, scene.render.resolution_y = (1200, 1800) if index == 1 else (2048, 1536)
    camera.data.ortho_scale = [4.8, 3.85, 5.25, 5.8][index]
    scene.render.filepath = os.path.join(OUT, [
        "vintage-blender-tablet.png", "vintage-blender-phone.png", "vintage-blender-desktop.png", "vintage-blender-central-monitoring-tv.png"
    ][index])
    bpy.ops.render.render(write_still=True)

# Restore visibility and save an editable source scene with all four modeled
# devices, screen graphics, studio materials, camera, and lighting.
for col in device_collections:
    col.hide_render = False
scene.render.resolution_x, scene.render.resolution_y = 1536, 1024
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "janitri-vintage-devices.blend"))

# Export one physically modelled device per glTF binary. Convert text and curves
# to meshes only after saving the editable Blender source file.
for index, col in enumerate(device_collections):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in col.objects:
        obj.select_set(True)
    if col.objects:
        bpy.context.view_layer.objects.active = col.objects[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, ["maternal-care-tablet.glb", "mothers-care-phone.glb", "neonatal-desktop.glb", "central-monitoring-tv.glb"][index]),
        export_format="GLB", use_selection=True, export_apply=True, export_materials="EXPORT"
    )
print("Rendered and exported four vintage-styled 3D Janitri device assets.")
