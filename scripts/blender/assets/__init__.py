"""Importing this package registers every asset generator."""
import importlib

for name in ('furniture', 'vegetation', 'architecture', 'equipment', 'characters'):
    try:
        importlib.import_module(f'{__name__}.{name}')
    except ModuleNotFoundError as exc:
        if name not in str(exc):
            raise
