"""The Makerzoid dinosaur: a snap-together kit robot that walks.

Kit parts (beams with peg holes, motors at the joints, a controller brick) are built in GG materials, then
joined into one mesh skinned to a small armature with rigid weights and coloured per vertex, so the whole
robot is one draw call. The `walk` clip steps diagonal leg pairs, bobs the head and swings the tail.
"""
import math

import bpy
from mathutils import Vector

from gg import geometry
from gg.geometry import ball, box, cyl
from gg.materials import SPEC, gg_material, linear
from gg.sockets import register

HIP_Z = .24
SWING = math.radians(25)
FRAMES = 33
SIDES = (('l', 1), ('r', -1))  # Blender front is -Y, so the dinosaur's left is +X.

def holes(prefix, x, ys, z, face):
    """Peg holes on the outer face of a beam: what makes a beam read as a kit part."""
    for i, y in enumerate(ys):
        cyl(f'{prefix}_hole{i}', .009, .009, .006, (x + face * .003, y, z), 'GG_PurpleDark', seg=10, bev=0,
            rot=(0, math.pi / 2, 0), centred=True)

def build_parts():
    """Every part as (object, bone)."""
    parts = []
    add = lambda bone, *objs: parts.extend((o, bone) for o in objs)
    # Frame and body.
    for side, s in SIDES:
        add('body', box(f'rail_{side}', (.03, .44, .04), (s * .085, 0, HIP_Z), 'GG_PurplePrimary', r=.008))
        holes(f'rail_{side}', s * .1, (-.15, -.075, 0, .075, .15), HIP_Z, s)
        add('body', *[o for o in bpy.data.objects if o.name.startswith(f'rail_{side}_hole')])
    add('body', box('panel', (.15, .34, .1), (0, 0, HIP_Z + .07), 'GG_GreenFoliage', r=.03, seg=3),
        box('brick', (.1, .12, .05), (0, .03, HIP_Z + .145), 'GG_IvorySoft', r=.012, seg=2),
        cyl('light', .016, .016, .01, (0, .0, HIP_Z + .17), 'GG_TurquoiseAccent', seg=12, bev=.003))
    for i, y in enumerate((-.12, -.04, .04, .12)):
        add('body', box(f'stud{i}', (.03, .03, .02), (0, y, HIP_Z + .125), 'GG_OrangeAccent', r=.006) if i in (0, 3) else
            box(f'stud{i}', (.03, .03, .02), (.0, y, HIP_Z + .125), 'GG_PurplePrimary', r=.006))
    # Legs: a motor at each hip, a beam with holes, a foot.
    for end, y in (('f', -.12), ('b', .12)):
        for side, s in SIDES:
            bone = f'leg_{end}{side}'
            x = s * .125
            add(bone, cyl(f'{bone}_motor', .036, .036, .04, (x, y, HIP_Z), 'GG_PurpleDark', seg=16, bev=.006, rot=(0, math.pi / 2, 0), centred=True),
                cyl(f'{bone}_cap', .021, .021, .012, (x + s * .024, y, HIP_Z), 'GG_OrangeAccent', seg=14, bev=.003, rot=(0, math.pi / 2, 0), centred=True),
                box(f'{bone}_beam', (.034, .036, .215), (x, y, HIP_Z - .1075), 'GG_PurplePrimary', r=.008),
                box(f'{bone}_foot', (.06, .085, .03), (x, y - .01, .015), 'GG_IvorySoft', r=.01))
            holes(f'{bone}_beam', x + s * .017, (y,), HIP_Z - .06, s)
            holes(f'{bone}_low', x + s * .017, (y,), HIP_Z - .13, s)
            add(bone, *[o for o in bpy.data.objects if o.name.startswith((f'{bone}_beam_hole', f'{bone}_low_hole'))])
    # Neck and head.
    add('neck', cyl('neck_motor', .034, .034, .1, (0, -.17, HIP_Z + .07), 'GG_PurpleDark', seg=16, bev=.006, rot=(0, math.pi / 2, 0), centred=True),
        box('neck_beam', (.036, .036, .17), (0, -.22, HIP_Z + .125), 'GG_PurplePrimary', r=.008, rot=(.74, 0, 0)))
    add('head', box('head', (.12, .15, .09), (0, -.31, HIP_Z + .2), 'GG_GreenFoliage', r=.025, seg=3),
        box('snout', (.09, .05, .05), (0, -.38, HIP_Z + .18), 'GG_IvorySoft', r=.012, seg=2))
    for side, s in SIDES:
        add('head', box(f'eye_{side}', (.03, .01, .022), (s * .033, -.386, HIP_Z + .225), 'GG_TurquoiseAccent', r=.004, seg=1))
    # Tail.
    add('tail', cyl('tail_motor', .03, .03, .09, (0, .2, HIP_Z + .04), 'GG_PurpleDark', seg=16, bev=.006, rot=(0, math.pi / 2, 0), centred=True),
        box('tail_beam', (.034, .13, .034), (0, .28, HIP_Z + .05), 'GG_PurplePrimary', r=.008),
        box('tail_tip', (.024, .07, .024), (0, .37, HIP_Z + .062), 'GG_GreenDark', r=.006))
    holes('tail_beam', .02, (.25, .31), HIP_Z + .05, 1)
    add('tail', *[o for o in bpy.data.objects if o.name.startswith('tail_beam_hole')])
    # Back fins: the dinosaur silhouette, in kit plates.
    for i, y in enumerate((-.1, .0, .1)):
        add('body', box(f'fin{i}', (.012, .06, .06), (0, y + .02, HIP_Z + .16), 'GG_OrangeAccent', r=.004, rot=(.785, 0, 0)))
    return parts

def armature():
    data = bpy.data.armatures.new('dino')
    arm = bpy.data.objects.new('dino_rig', data)
    b = geometry.current()
    b.coll.objects.link(arm)
    arm.parent = b.root
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name, head, tail, parent=None):
        e = data.edit_bones.new(name)
        e.head, e.tail = head, tail
        if parent:
            e.parent = data.edit_bones[parent]
        return e
    bone('body', (0, 0, HIP_Z), (0, 0, HIP_Z + .1))
    for end, y in (('f', -.12), ('b', .12)):
        for side, s in SIDES:
            bone(f'leg_{end}{side}', (s * .125, y, HIP_Z), (s * .125, y, .02), 'body')
    bone('neck', (0, -.17, HIP_Z + .07), (0, -.26, HIP_Z + .19), 'body')
    bone('head', (0, -.26, HIP_Z + .19), (0, -.36, HIP_Z + .2), 'neck')
    bone('tail', (0, .2, HIP_Z + .04), (0, .4, HIP_Z + .065), 'body')
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm

def join_skinned(parts, arm):
    """One mesh: each part's colour into a colour attribute, rigid weights to its bone, one material."""
    view = bpy.context.view_layer
    for ob, bone in parts:
        for mod in list(ob.modifiers):
            with bpy.context.temp_override(object=ob, active_object=ob):
                bpy.ops.object.modifier_apply(modifier=mod.name)
        ob.data = ob.data.copy()
        colour = linear(SPEC[ob.data.materials[0].name]['color'])
        attr = ob.data.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        for item in attr.data:
            item.color = colour
        group = ob.vertex_groups.new(name=bone)
        group.add(range(len(ob.data.vertices)), 1.0, 'REPLACE')
    bpy.ops.object.select_all(action='DESELECT')
    for ob, _ in parts:
        ob.select_set(True)
    body = parts[0][0]
    view.objects.active = body
    bpy.ops.object.join()
    body.name = 'dino'
    world = body.matrix_world.copy()
    body.data.materials.clear()
    body.data.materials.append(gg_material('GG_KitVertex'))
    body.data.polygons.foreach_set('material_index', [0] * len(body.data.polygons))
    body.data.color_attributes.active_color = body.data.color_attributes['Col']
    body.parent = arm
    body.matrix_world = world
    body.modifiers.new('rig', 'ARMATURE').object = arm
    return body

def walk(arm):
    """Diagonal pairs swing together; the head bobs twice and the tail sways once per loop."""
    action = bpy.data.actions.new('walk')
    arm.animation_data_create().action = action
    for bone in arm.pose.bones:
        bone.rotation_mode = 'XYZ'
    for frame in range(1, FRAMES + 1, 4):
        # Starts at full stride, so the clip preview's first and middle frames show opposite steps.
        phase = 2 * math.pi * (frame - 1) / (FRAMES - 1) + math.pi / 2
        swing = SWING * math.sin(phase)
        for name, sign in (('leg_fl', 1), ('leg_br', 1), ('leg_fr', -1), ('leg_bl', -1)):
            arm.pose.bones[name].rotation_euler = (sign * swing, 0, 0)
        arm.pose.bones['head'].rotation_euler = (math.radians(6) * math.sin(2 * phase), 0, 0)
        arm.pose.bones['tail'].rotation_euler = (0, 0, math.radians(15) * math.sin(phase))
        arm.pose.bones['body'].location = (0, .01 * abs(math.sin(phase)), 0)
        for bone in arm.pose.bones:
            bone.keyframe_insert('rotation_euler', frame=frame)
        arm.pose.bones['body'].keyframe_insert('location', frame=frame)
    return action

@register('equip-dino', budget=5000)
def kit_dino():
    arm = armature()
    join_skinned(build_parts(), arm)
    walk(arm)
    # While a pair is planted it sweeps 2 L sin(swing); the two pairs take turns, so a loop covers twice that.
    stride = 2 * 2 * HIP_Z * math.sin(SWING)
    return {'clips': ['walk'], 'armature': arm.name, 'stride': round(stride, 4), 'walk_seconds': round((FRAMES - 1) / 24, 4)}
