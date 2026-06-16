import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "renderer" / "unreal" / "SmartIntersection" / "SourceAssets" / "PhotorealRoadKit" / "Meshes"
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()


def mat(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = color
    return m

BLACK = mat('black_powder_coated_metal', (0.015, 0.015, 0.014, 1))
GLASS = mat('dark_glass', (0.03, 0.08, 0.10, 1))
BRICK = mat('weathered_london_brick', (0.44, 0.20, 0.13, 1))
STONE = mat('wet_london_stone', (0.48, 0.46, 0.40, 1))
WARM = mat('warm_window_light', (1.0, 0.55, 0.22, 1))


def shade(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_smooth()
    except Exception:
        pass
    obj.select_set(False)
    return obj


def cube(name, loc, scale, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    bevel = o.modifiers.new(name='small bevels catch wet-light edges', type='BEVEL')
    bevel.width = min(scale) * 0.08
    bevel.segments = 2
    o.modifiers.new(name='weighted normals', type='WEIGHTED_NORMAL')
    return o


def cyl(name, loc, radius, depth, material, vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o=bpy.context.object; o.name=name; o.data.materials.append(material)
    o.modifiers.new(name='weighted normals', type='WEIGHTED_NORMAL')
    return shade(o)


def export_selected(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    path = OUT / f"{name}.fbx"
    bpy.ops.export_scene.fbx(
        filepath=str(path),
        use_selection=True,
        object_types={'MESH'},
        apply_unit_scale=True,
        bake_space_transform=False,
        add_leaf_bones=False,
        mesh_smooth_type='FACE',
        use_mesh_modifiers=True,
        path_mode='AUTO',
    )
    return path


def streetlight():
    objs=[cyl('tapered round pole', (0,0,150), 4, 300, BLACK, 64), cyl('heavy base collar', (0,0,10), 10, 20, BLACK, 64)]
    # arched arm made from short bevelled segments
    for i in range(8):
        x=14+i*14; z=296 - (i*i)*0.55
        o=cube(f'curved lamp arm segment {i}', (x,0,z), (30,6,6), BLACK)
        o.rotation_euler[1]=math.radians(-i*2.5)
        objs.append(o)
    objs += [cube('lamp housing beveled shell', (128,0,266), (54,24,15), BLACK), cube('lamp glass diffuser', (128,-3,255), (40,17,4), GLASS)]
    return export_selected('london_streetlight_high_fidelity', objs)


def railing():
    objs=[]
    for x in [-135,-90,-45,0,45,90,135]:
        objs.append(cyl(f'round vertical railing post {x}', (x,0,45), 3.2, 90, BLACK, 32))
    for z in [18,50,82]:
        rail=cube(f'continuous rounded guard rail {z}', (0,0,z), (292,6,6), BLACK); objs.append(rail)
    for x in [-112,-67,-22,23,68,113]:
        objs.append(cube(f'internal slim rail panel {x}', (x,0,50), (5,4,55), BLACK))
    return export_selected('london_pedestrian_railing_high_fidelity', objs)


def signal_head():
    objs=[cube('main black traffic signal backplate rounded', (0,0,54), (36,14,118), BLACK)]
    for idx,z in enumerate([94,54,14]):
        objs.append(cyl(f'round signal lens housing {idx}', (0,-10,z), 8.5, 8, BLACK, 48))
        objs.append(cube(f'deep sun visor hood {idx}', (0,-21,z+2), (28,24,7), BLACK))
        objs.append(cyl(f'dark glass signal lens {idx}', (0,-26,z), 6.2, 2, GLASS, 48))
    return export_selected('signal_head_uk_high_fidelity', objs)


def cctv():
    objs=[cube('weatherproof cctv camera body', (0,0,0), (62,25,22), BLACK), cube('overhanging rain hood', (-6,0,15), (78,32,6), BLACK), cyl('front lens barrel', (36,0,0), 8, 10, GLASS, 48), cube('mounting bracket yoke', (-42,0,-18), (10,10,36), BLACK), cyl('mast clamp cylinder', (-42,0,-48), 5, 42, BLACK, 32)]
    return export_selected('cctv_camera_high_fidelity', objs)


def shopfront():
    objs=[cube('deep brick facade shell', (0,0,170), (290,34,340), BRICK), cube('recessed dark shopfront glass', (0,-21,45), (252,10,84), GLASS)]
    for x in [-116,-58,0,58,116]:
        objs.append(cube(f'ground floor mullion {x}', (x,-28,45), (7,10,86), BLACK))
        objs.append(cube(f'upper window bay {x}', (x,-26,164), (34,8,68), GLASS))
        objs.append(cube(f'top window bay {x}', (x,-26,246), (34,8,64), GLASS))
    for z in [95,132,212,294,338]:
        objs.append(cube(f'projecting stone/cornice ledge {z}', (0,-31,z), (305,14,8), STONE))
    objs.append(cube('warm interior shop glow strip', (0,-33,73), (230,5,18), WARM))
    return export_selected('london_shopfront_high_fidelity', objs)


def window_strip():
    objs=[cube('single dark glass backing panel', (0,0,0), (278,8,70), GLASS)]
    for x in [-112,-56,0,56,112]:
        objs.append(cube(f'extruded black window mullion {x}', (x,-7,0), (6,8,78), BLACK))
    for z in [-24,0,24]:
        objs.append(cube(f'horizontal window transom {z}', (0,-8,z), (278,8,5), BLACK))
    return export_selected('london_window_strip_high_fidelity', objs)


paths=[streetlight(), railing(), signal_head(), cctv(), shopfront(), window_strip()]
print('BLENDER_HIGH_FIDELITY_FBX_WRITTEN')
for p in paths:
    print(p, p.stat().st_size)
