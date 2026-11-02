"""Asset registry and sockets."""
from . import geometry

ASSETS = {}

def register(asset_id, budget=None):
    def wrap(fn):
        ASSETS[asset_id] = (fn, budget)
        return fn
    return wrap

def add_socket(name, loc):
    geometry.current().socket(name, loc)
