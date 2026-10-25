#!/usr/bin/env python3
"""Negative checks in memory; never mutates delivered recipes."""
import copy
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('gg_r2',HERE/'generar_planos.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
parts,assembly=mod.read_inputs(HERE.parent)
results=[]

def case(name,change):
    p,a=copy.deepcopy(parts),copy.deepcopy(assembly)
    change(p,a)
    result=mod.validate(p,a)
    results.append({'name':name,'detected':not result['all_passed'],'errors':result['errors']})

baseline=mod.validate(parts,assembly)
case('Conteo guardado falso',lambda p,a:p[0]['metadata'].__setitem__('triangles',999))
case('Geometría alterada con bounds obsoletos',lambda p,a:p[0]['mesh']['vertices'][0].__setitem__(0,-.2))
case('Índice fuera de rango',lambda p,a:p[0]['mesh']['faces'][0].__setitem__(0,9999))
case('Coordenada no finita',lambda p,a:p[0]['mesh']['vertices'][0].__setitem__(1,float('nan')))
case('Ciclo de jerarquía',lambda p,a:a['rig'][0].__setitem__('parent','head'))
case('Instancia desplazada sin actualizar anclaje',lambda p,a:a['instances'][1]['position_H'].__setitem__(0,.02))
ok=baseline['all_passed'] and all(r['detected'] for r in results)
print(json.dumps({'baseline_passed':baseline['all_passed'],'all_negative_cases_detected':ok,'cases':results},ensure_ascii=False,indent=2))
raise SystemExit(0 if ok else 1)
