import bpy
import math
import os
import json
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT = os.path.dirname(os.path.abspath(__file__))
OUTLINES = json.load(open(os.path.join(ROOT, "vintage-cutout-bounds.json")))
ITEMS = [
    ("tablet", "tablet-3d-cutout.png", "Maternal care tablet", 3.7),
    ("phone", "phone-3d-cutout.png", "Mothers care phone", 2.5),
    ("desktop", "desktop-3d-cutout.png", "Neonatal care desktop", 3.55),
    ("central-monitoring-tv", "central-monitoring-tv-3d-cutout.png", "Central monitoring TV", 3.85),
]

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)

def track(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()

def make_material(name, color, metallic=0.0, roughness=0.4):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return material

def make_backing(name, width, height, depth, key):
    item = OUTLINES[key.replace("central-monitoring-tv", "central-monitoring-tv-3d").replace("tablet", "tablet-3d").replace("phone", "phone-3d").replace("desktop", "desktop-3d")]
    x0, y0, x1, y1 = item["bounds"]
    points = []
    for x, y in item["outline"]:
        px = ((x - x0) / (x1 - x0) - 0.5) * width
        py = (0.5 - (y - y0) / (y1 - y0)) * height
        points.append(Vector((px, py, 0)))
    triangles = tessellate_polygon([points])
    verts = [(p.x, p.y, 0) for p in points] + [(p.x, p.y, -depth) for p in points]
    count = len(points)
    faces = [tuple(tri) for tri in triangles]
    faces += [tuple(count + i for i in reversed(tri)) for tri in triangles]
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    mesh = bpy.data.meshes.new(name + " · extruded vintage silhouette")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    body = bpy.data.objects.new(name + " · outline-matched solid device body", mesh)
    bpy.context.collection.objects.link(body)
    bevel = body.modifiers.new("Soft machined edges", "BEVEL")
    bevel.width = min(0.035, height * 0.015)
    bevel.segments = 3
    bevel.profile = 0.5
    body.modifiers.new("Weighted edge normals", "WEIGHTED_NORMAL")
    body.data.materials.append(make_material(name + " · ivory ceramic body", (0.73, 0.64, 0.49), 0.32, 0.24))
    return body

def make_art_plane(name, image_path, width, height, depth):
    mesh = bpy.data.meshes.new(name + " · original render face mesh")
    verts = [(-width/2,-height/2,0.002),(width/2,-height/2,0.002),(width/2,height/2,0.002),(-width/2,height/2,0.002)]
    mesh.from_pydata(verts, [], [(0,1,2,3)])
    mesh.update()
    uv = mesh.uv_layers.new(name="Original render UV")
    for loop_index, coord in zip(mesh.polygons[0].loop_indices, ((0,0),(1,0),(1,1),(0,1))):
        uv.data[loop_index].uv = coord
    art = bpy.data.objects.new(name + " · exact approved vintage artwork", mesh)
    bpy.context.collection.objects.link(art)

    mat = bpy.data.materials.new(name + " · untouched source-image texture")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    output = nodes.get("Material Output")
    nodes.remove(nodes.get("Principled BSDF"))
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image_path, check_existing=True)
    tex.image.pack()
    tex.interpolation = "Linear"
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Strength"].default_value = 1.0
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(tex.outputs["Color"], emission.inputs["Color"])
    links.new(tex.outputs["Alpha"], mix.inputs["Fac"])
    links.new(transparent.outputs["BSDF"], mix.inputs[1])
    links.new(emission.outputs["Emission"], mix.inputs[2])
    links.new(mix.outputs["Shader"], output.inputs["Surface"])
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    else:
        mat.blend_method = "HASHED"
    art.data.materials.append(mat)
    return art, mat

def add_area(name, location, energy, size, point=(0,0,0)):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    track(light, point)
    return light

def set_camera(center, dimensions):
    bpy.ops.object.camera_add(location=(0, 0, 9.0))
    camera = bpy.context.object
    camera.name = "Product view · straight-on art with dimensional edge"
    track(camera, center)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(dimensions[0], dimensions[1]) * 1.2
    bpy.context.scene.camera = camera
    return camera

for key, source_file, display_name, physical_width in ITEMS:
    clear_scene()
    image_path = os.path.join(ROOT, source_file)
    image = bpy.data.images.load(image_path, check_existing=True)
    px_w, px_h = image.size
    aspect = px_w / px_h
    width = physical_width
    height = width / aspect
    thickness = 0.18 if key in ("phone", "tablet") else 0.24

    body = make_backing(display_name, width, height, thickness, key)
    art, art_material = make_art_plane(display_name, image_path, width, height, thickness)
    for obj in (body, art):
        obj.rotation_euler[1] = math.radians(12)
        obj.rotation_euler[0] = math.radians(-4)
    body["source_art"] = source_file.replace("-cutout.png", ".png")
    body["construction"] = "Solid beveled backing with original approved render mapped unchanged to the front face."
    art["source_art"] = source_file.replace("-cutout.png", ".png")
    art["source_image_preserved"] = True
    art["relief_depth"] = thickness

    add_area("Warm key", (4,-4,7), 950, 5)
    add_area("Soft fill", (-4,-1,5), 650, 4)
    add_area("Edge light", (2,4,4), 800, 3)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 1500
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.resolution_percentage = 100
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "Standard"
    scene.world.color = (0.16,0.12,0.08)
    camera = set_camera((0,0,0), (width,height))
    camera.data.lens = 60
    scene.render.filepath = os.path.join(ROOT, f"vintage-relief-{key}.png")
    bpy.ops.render.render(write_still=True)

    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    art.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, f"vintage-relief-{key}.glb"), export_format="GLB", use_selection=True, export_apply=True, export_image_format="AUTO")
    print("Rendered and exported exact-source relief:", key, flush=True)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "janitri-exact-vintage-reliefs.blend"))
