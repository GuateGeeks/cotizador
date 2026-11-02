"""Socket checks against measured GLB bounds (glTF axes: Y up, front +Z)."""

FACES = {'socket_east': (0, 'max'), 'socket_west': (0, 'min'), 'socket_floor_above': (1, 'max'), 'socket_floor_below': (1, 'min')}

def check_pair(a, socket_a, b, socket_b):
    """Largest error, in metres, when b is moved so its socket lands on a's socket.

    Covers both the gap between the touching faces and any misalignment off that axis.
    """
    pa, pb = a['sockets'][socket_a], b['sockets'][socket_b]
    axis, side = FACES[socket_a]
    other_axis, other_side = FACES[socket_b]
    offset = [pa[i] - pb[i] for i in range(3)]
    gap = abs(a['bounds'][side][axis] - (b['bounds'][other_side][other_axis] + offset[other_axis]))
    level = abs(a['bounds']['min'][1] - (b['bounds']['min'][1] + offset[1])) if axis != 1 else 0
    return max(gap, level)
