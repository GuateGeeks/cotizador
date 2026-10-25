#!/usr/bin/env python3
"""Authoring source for GuateGeeks primary pupil R2. Stdlib only."""
from __future__ import annotations
import argparse, collections, copy, hashlib, json, math, pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
H = .78
GAP = .004 / H
COL = dict(skin='#E5AD80', hair='#3A2E5C', ink='#321853', violet='#6942A1', white='#FBFAF7', navy='#33438A', shoe='#2B2340', turquoise='#19BCCD')
NAMES = ['cabeza','cuello','oreja','ojo','sonrisa','cabello-nucleo','mechon-flequillo','torso-chaleco','pechera-camisa','solapa-cuello','manga','brazo','antebrazo','mano','pelvis-pantalon','muslo-pantalon','pantorrilla-pantalon','zapato','mochila','tirante']
TITLES = ['Cabeza','Cuello','Oreja','Ojo','Sonrisa','Núcleo del cabello','Mechón de flequillo','Torso y chaleco','Pechera de camisa','Solapa del cuello','Manga corta','Brazo','Antebrazo','Mano','Pelvis del pantalón','Muslo del pantalón','Pantorrilla del pantalón','Zapato','Mochila','Tirante']

def add(a,b): return [a[i]+b[i] for i in range(3)]
def sub(a,b): return [a[i]-b[i] for i in range(3)]
def mul(a,k): return [x*k for x in a]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def norm(a): return math.sqrt(dot(a,a))
def unit(a): return mul(a,1/norm(a))
def mean(vs): return [sum(p[k] for p in vs)/len(vs) for k in range(3)]
def bounds(vs):
    lo=[min(p[k] for p in vs) for k in range(3)]; hi=[max(p[k] for p in vs) for k in range(3)]
    return {'min':lo,'max':hi,'size':sub(hi,lo)}
def quad(a,b,c,d): return [[a,b,c],[a,c,d]]
def orient(vs,fs,center=None):
    c=center or mean(vs); out=[]
    for f in fs:
        a,b,d=[vs[i] for i in f]; n=cross(sub(b,a),sub(d,a))
        out.append(f[::-1] if dot(n,sub(mean([a,b,d]),c))<0 else f)
    return out
def rings_mesh(lo,hi,caps=True):
    n=len(lo); vs=lo+hi; fs=[]
    for i in range(n): fs+=quad(i,(i+1)%n,(i+1)%n+n,i+n)
    if caps:
        for i in range(1,n-1): fs += [[0,i+1,i],[n,n+i,n+i+1]]
    return vs,orient(vs,fs)
def rect(w,d,y,z=0): return [[-w/2,y,z-d/2],[w/2,y,z-d/2],[w/2,y,z+d/2],[-w/2,y,z+d/2]]
def tri(w,d,y,z=0): return [[-w/2,y,z+d*.35],[w/2,y,z+d*.35],[0,y,z-d*.65]]
def shade(hexcol,k):
    rgb=[int(hexcol[i:i+2],16) for i in (1,3)] + [int(hexcol[5:7],16)]
    return '#'+''.join(f'{min(255,max(0,round(v*k))):02x}' for v in rgb)

def make_part(num,vs,fs,color,kind,desc,notes,construction):
    ident=f'P{num:02d}'; slug=ident+'-'+NAMES[num-1]
    # Symmetric, deterministic facet colours; these describe albedo, not baked shadows.
    return {'schema_version':'2.0','id':ident,'slug':slug,'name':TITLES[num-1],
      'purpose':desc,'units':'normalized_H','scene_height':H,
      'coordinate_system':{'up':'+Y','front':'+Z','anatomical_left':'+X'},
      'mesh':{'vertices':vs,'faces':fs,'face_colors':[shade(color,[1,.98,1.02,1][i%4]) for i in range(len(fs))]},
      'material':{'base_color_srgb':color,'flat_shading':True,'roughness':.92,'metalness':0,'uv_required':False},
      'construction':construction,'sockets':{'origin':{'position_local_H':[0,0,0],'description':'Origen numérico de esta pieza; montaje mediante assembly.json.'}},
      'metadata':{'surface_kind':kind,'limitations':notes,'triangles':len(fs),'bounds_local_H':bounds(vs),
        'dimensions_scene':mul(bounds(vs)['size'],H),'authoritative_for':'support_geometry_only',
        'reference_render_policy':'Las vistas técnicas muestran ambos lados de superficies abiertas; eso no añade caras a los JSON ni obliga a DoubleSide en runtime.'}}

def presets():
    parts=[]
    # P01: tapered hexagonal head. Flat front supports face appliques exactly.
    sec=[[-.5,1],[.5,1],[1,0],[.5,-1],[-.5,-1],[-1,0]]
    jaw_y=[0,0,.025,.018,.018,.025]
    lo=[[x*.1125*.80,jaw_y[i],z*.085*.72] for i,(x,z) in enumerate(sec)]; hi=[[x*.1125,.22,z*.085] for x,z in sec]
    vs,fs=rings_mesh(lo,hi)
    parts.append(make_part(1,vs,fs,COL['skin'],'closed','Volumen facial facetado, mandíbula más estrecha que sienes.',
      ['Forma de apoyo simplificada; el cabello oculta el cierre superior. No incluye nariz saliente.'],
      'Dos secciones hexagonales, doce triángulos laterales y cuatro en cada tapa.'))
    vs,fs=rings_mesh(tri(.045,.04,-.02),tri(.040,.038,.045))
    parts.append(make_part(2,vs,fs,COL['skin'],'closed','Conecta el torso con la cabeza manteniendo un volumen visible pequeño.',
      ['Sigue a head; revisar cobertura inferior al inclinar la cabeza.'], 'Prisma triangular cerrado y ligeramente cónico.'))
    vs=[[0,-.014,0],[0,.014,0],[0,0,-.016],[.038,0,0]]; fs=orient(vs,[[0,1,2],[0,3,1],[1,3,2],[2,3,0]])
    parts.append(make_part(3,vs,fs,COL['skin'],'closed','Pequeña oreja facetada; una receta se refleja para el lado derecho.',
      ['La base penetra de forma intencional en la cabeza y el cabello; solo el extremo exterior queda visible. Sin cavidad anatómica ni detalles interiores.'], 'Tetraedro de cuatro caras con base de encaje oculta.'))
    slope=(.085-.085*.72)/.22
    vs=[[-.006,0,0],[0,.009,.009*slope],[.006,0,0],[0,-.009,-.009*slope]]
    fs=[[0,3,2],[0,2,1]]
    parts.append(make_part(4,vs,fs,COL['ink'],'planar','Aplique oscuro de ojo; repetir dos veces sin volumen adicional.',
      ['Superficie sin espesor; vistas de canto casi lineales. La orientación coincide con la cara frontal de la cabeza.'], 'Rombo plano triangulado, dos triángulos.'))
    mouth=[[-.018,0],[0,-.003],[.018,0],[.009,-.008],[-.009,-.008]]
    vs=[[x,y,y*slope] for x,y in mouth]; fs=[[0,4,1],[1,4,3],[1,3,2]]
    parts.append(make_part(5,vs,fs,COL['ink'],'planar','Sonrisa breve, angular y legible como un aplique de papel.',
      ['Cinco vértices y tres triángulos; no representa labios ni boca volumétrica.'], 'Polígono cóncavo plano de cinco vértices, triangulación explícita.'))
    # Hair: ring 8 -> ring8 -> ring4 -> apex, open at hairline.
    sec8=[[-.6,1],[.6,1],[1,.40],[1,-.45],[.55,-1],[-.55,-1],[-1,-.45],[-1,.40]]
    ys=[.14,.14,.08,.045,.02,.02,.045,.08]
    r0=[[x*.118,ys[i],z*.087] for i,(x,z) in enumerate(sec8)]
    r1=[[x*.137,.225+(0.006 if i in (0,1) else 0),z*.105-.005] for i,(x,z) in enumerate(sec8)]
    r2=[[0,.26,.072],[.085,.255,-.005],[0,.258,-.083],[-.085,.252,-.005]]
    vs=r0+r1+r2+[[-.025,.28,-.008]]; fs=[]
    for i in range(8): fs+=quad(i,(i+1)%8,8+(i+1)%8,8+i)
    for j in range(4):
        a=8+(2*j+7)%8; b=8+2*j; c=8+(2*j+1)%8; u=16+j; un=16+(j+1)%4
        fs += [[a,b,u],[b,c,u],[c,un,u]]
    for j in range(4): fs += [[16+j,16+(j+1)%4,20]]
    fs=orient(vs,fs,[0,.19,0])
    parts.append(make_part(6,vs,fs,COL['hair'],'open','Masa principal con coronilla elevada y silueta ancha, sin cierre plano grande.',
      ['Abertura inferior intencional sobre la cabeza. No es un sólido imprimible.'], 'Banda de 8 a 8 vértices: 16 triángulos; transición de 8 a 4: 12; ápice desplazado: 4.'))
    w=.044; h=.055
    hair_front_slope=(.100-.087)/(.951-.860)
    vs=[[-w/2,0,0],[0,.004,.012],[w/2,0,0],[-w*.40,-h*.83,0],[0,-h,.012],[w*.35,-h*.83,0]]
    vs=[[x,y,z+hair_front_slope*y] for x,y,z in vs]
    fs=quad(0,3,4,1)+quad(1,4,5,2)
    parts.append(make_part(7,vs,fs,COL['hair'],'open','Mechón ancho de papel con una cresta longitudinal; tres instancias forman el flequillo.',
      ['Superficie plegada sin espesor. Las puntas deben permanecer por encima de los ojos.'], 'Dos cuadriláteros no coplanares, cuatro triángulos.'))
    octa=[[-.6,1],[.6,1],[1,.45],[1,-.45],[.6,-1],[-.6,-1],[-1,-.45],[-1,.45]]
    lo=[[x*.1175,-.01,z*.071] for x,z in octa]
    hi=[[x*.13,.25-(.014 if abs(x)>.9 else 0),z*.062] for x,z in octa]
    vs,fs=rings_mesh(lo,hi,False)
    fs += [[8,8+i,8+i+1] for i in range(1,7)]
    fs=orient(vs,fs,[0,.115,0])
    parts.append(make_part(8,vs,fs,COL['violet'],'open','Chaleco de torso ancho, cintura más estrecha y hombros descendentes.',
      ['Bajo abierto y oculto por pelvis en reposo. Comprobar unión al inclinar torso; sin garantía de todas las poses.'], 'Dos anillos octagonales, dieciséis triángulos laterales y seis en tapa superior.'))
    tslope=(.062-.071)/.26
    vs=[[-.039,0,0],[0,-.076,-.076*tslope],[.039,0,0]]; fs=[[0,1,2]]
    parts.append(make_part(9,vs,fs,COL['white'],'planar','Triángulo blanco que hace visible el escote en V.',
      ['Aplique plano colocado a distancia normal controlada del chaleco.'], 'Un triángulo; no tiene espesor ni volumen de camisa oculto.'))
    vs=[[0,0,0],[.025,-.044,-.044*tslope+.003],[.045,-.008,-.008*tslope]]; fs=[[0,1,2]]
    parts.append(make_part(10,vs,fs,COL['white'],'planar','Una hoja triangular del cuello; reflejar para obtener la segunda.',
      ['Aplique triangular inclinado. Requiere distancia normal respecto a la pechera.'], 'Un triángulo por solapa; dos instancias.'))
    vs,fs=rings_mesh(rect(.071,.068,.01),rect(.084,.074,-.065),False)
    parts.append(make_part(11,vs,fs,COL['white'],'open','Manga corta con boca superior positiva y salida amplia para el brazo.',
      ['Ambos extremos abiertos. Su cobertura se valida en reposo; poses amplias pueden exigir tapas y rebalanceo del presupuesto.'], 'Dos secciones rectangulares de cuatro vértices, cuatro paneles y ocho triángulos.'))
    vs,fs=rings_mesh(tri(.046,.045,-.030),tri(.040,.040,-.133))
    parts.append(make_part(12,vs,fs,COL['skin'],'closed','Segmento superior del brazo, parcialmente cubierto por la manga.',
      ['Prisma triangular de apoyo; revisar silueta del codo en giro.'], 'Prisma triangular cerrado, ocho triángulos.'))
    vs,fs=rings_mesh(tri(.041,.040,.009),tri(.033,.034,-.118,.012))
    parts.append(make_part(13,vs,fs,COL['skin'],'closed','Antebrazo más estrecho hacia la muñeca, con leve desplazamiento hacia delante.',
      ['La mano comparte foreL/foreR; no hay hueso adicional de muñeca.'], 'Prisma triangular cerrado de secciones variables.'))
    vs,fs=rings_mesh(tri(.033,.034,.006),tri(.041,.043,-.047,.008))
    parts.append(make_part(14,vs,fs,COL['skin'],'closed','Mano simplificada de palma ancha y dedos reunidos.',
      ['Sin dedos ni pulgar separado. Es un volumen de apoyo facetado.'], 'Prisma triangular cerrado, ocho triángulos.'))
    vs,fs=rings_mesh(rect(.215,.120,-.031),rect(.235,.130,.022),False)
    parts.append(make_part(15,vs,fs,COL['navy'],'open','Cintura y pelvis del pantalón que enlazan chaleco y muslos.',
      ['Bocas superior e inferior abiertas; la inferior se cubre parcialmente con ambos muslos. Revisar vista inferior y poses sentadas.'], 'Banda rectangular de cuatro paneles, ocho triángulos.'))
    vs,fs=rings_mesh(rect(.072,.092,-.200),rect(.084,.105,.01))
    parts.append(make_part(16,vs,fs,COL['navy'],'closed','Pierna de pantalón desde cadera a rodilla, ligeramente cónica.',
      ['Cierre en rodilla se conserva para animación.'], 'Prisma rectangular cerrado de doce triángulos.'))
    vs,fs=rings_mesh(rect(.067,.087,-.210),rect(.073,.094,.01))
    parts.append(make_part(17,vs,fs,COL['navy'],'closed','Pantalón desde rodilla hasta tobillo, con solape de unión.',
      ['Revisar alineación con zapato y cobertura del cambio de hueso.'], 'Prisma rectangular cerrado de doce triángulos.'))
    lo=rect(.087,.136,0,.020)
    hi=[[-.041,.060,-.045],[.041,.060,-.045],[.039,.035,.088],[-.039,.035,.088]]
    vs,fs=rings_mesh(lo,hi)
    parts.append(make_part(18,vs,fs,COL['shoe'],'closed','Zapato compacto con talón, empeine alto y puntera de espesor visible.',
      ['Sin suela adicional ni detalles de cordones. La parte frontal tiene altura positiva.'], 'Prisma rectangular modificado de ocho vértices y doce triángulos.'))
    lo=rect(.155,.067,0); hi=rect(.145,.061,.155,-.002)
    vs,fs=rings_mesh(lo,hi)
    parts.append(make_part(19,vs,fs,COL['turquoise'],'closed','Cuerpo de mochila compacto y cónico, situado en la espalda.',
      ['Sin bolsillo, cierre, asa o solapa geométrica independiente. Añadirlos exige redistribuir el presupuesto.'], 'Prisma cerrado de ocho vértices y doce triángulos.'))
    # The bridge clears the complete shoulder; rear panel reaches the backpack.
    path=[[0,-.150,.008],[0,.020,.008],[0,.020,-.155],[0,-.045,-.155]]
    vs=[]
    for x,y,z in path: vs += [[x-.009,y,z],[x+.009,y,z]]
    fs=[]
    for i in range(3): fs+=quad(2*i,2*i+1,2*i+3,2*i+2)
    parts.append(make_part(20,vs,fs,COL['turquoise'],'open','Correa plana de tres tramos: pecho, puente de hombro y unión trasera.',
      ['Superficie sin espesor. El puente mantiene holgura sobre el hombro en reposo.'], 'Tres paneles rectangulares, seis triángulos por tirante.'))

    inst=[]
    def I(pid,suffix,bone,pos,rot=None,mirror=False,parent=None,order=0,notes=''):
        ident=pid+suffix
        inst.append({'id':ident,'part_id':pid,'bone':bone,'position_H':pos,'rotation_deg_xyz':rot or [0,0,0],
          'scale_xyz':[1,1,1],'mirror_x':mirror,'assembly_order':order,
          'mount':{'parent_instance_id':parent,'source_socket':'origin','description':notes}})
    I('P15','', 'hips',[0,.45,0],order=1)
    I('P08','', 'torso',[0,.45,0],parent='P15',order=2)
    I('P02','', 'head',[0,.70,0],parent='P08',order=3)
    I('P01','', 'head',[0,.72,0],parent='P02',order=4)
    for sx,suf in [(1,'-L'),(-1,'-R')]: I('P03',suf,'head',[sx*.094,.824,0],mirror=sx<0,parent='P01',order=5)
    face_slope=(.085-.085*.72)/.22; nf=unit([0,-face_slope,1])
    def face_origin(x,y): return add([x,y,.085*.72+face_slope*(y-.72)],mul(nf,GAP))
    for sx,suf in [(1,'-L'),(-1,'-R')]: I('P04',suf,'head',face_origin(sx*.035,.830),parent='P01',order=6)
    I('P05','','head',face_origin(0,.783),parent='P01',order=7)
    I('P06','','head',[0,.72,0],parent='P01',order=8)
    for suf,x,rz in [('-L',.038,-7),('-C',0,6),('-R',-.038,10)]: I('P07',suf,'head',[x,.910,.0940],[0,0,rz],parent='P06',order=9)
    nt=unit([0,-tslope,1])
    def front_torso(x,y,extra=1): return add([x,y,.071+tslope*(y-.44)],mul(nt,GAP*extra))
    I('P09','','torso',front_torso(0,.690),parent='P08',order=10)
    for sx,suf in [(1,'-L'),(-1,'-R')]: I('P10',suf,'torso',front_torso(sx*.004,.705,2.1),mirror=sx<0,parent='P08',order=11)
    for sx,suf in [(1,'-L'),(-1,'-R')]:
        I('P11',suf,'arm'+suf[1],[sx*.148,.680,0],mirror=sx<0,parent='P08',order=12)
        I('P12',suf,'arm'+suf[1],[sx*.148,.680,0],mirror=sx<0,parent='P11'+suf,order=13)
        I('P13',suf,'fore'+suf[1],[sx*.148,.555,0],mirror=sx<0,parent='P12'+suf,order=14)
        I('P14',suf,'fore'+suf[1],[sx*.148,.437,.012],mirror=sx<0,parent='P13'+suf,order=15)
        I('P16',suf,'leg'+suf[1],[sx*.058,.450,0],mirror=sx<0,parent='P15',order=16)
        I('P17',suf,'shin'+suf[1],[sx*.058,.255,0],mirror=sx<0,parent='P16'+suf,order=17)
        I('P18',suf,'shin'+suf[1],[sx*.058,0,0],mirror=sx<0,parent='P17'+suf,order=18)
    I('P19','','torso',[0,.500,-.109],parent='P08',order=19)
    for sx,suf in [(1,'-L'),(-1,'-R')]: I('P20',suf,'torso',[sx*.064,.700,.071],mirror=sx<0,parent='P19',order=20)
    rig=[('root',None,[0,0,0]),('hips','root',[0,.450,0]),('torso','hips',[0,.450,0]),('head','torso',[0,.700,0]),
      ('armL','torso',[.148,.680,0]),('armR','torso',[-.148,.680,0]),('foreL','armL',[.148,.555,0]),('foreR','armR',[-.148,.555,0]),
      ('legL','hips',[.058,.450,0]),('legR','hips',[-.058,.450,0]),('shinL','legL',[.058,.255,0]),('shinR','legR',[-.058,.255,0])]
    assembly={'schema_version':'2.0','id':'GG-PRIMARIA-R2','units':'normalized_H','scale_to_scene':H,
      'coordinate_system':{'up':'+Y','front':'+Z','anatomical_left':'+X','note':'L/R son lados del personaje, no del espectador.'},
      'transform_convention':{'vectors':'column','formula':'T(position_H) * Rz * Ry * Rx * S(scale_xyz * mirror_x)',
        'rotation_unit':'degrees','bake_rule':'Transformar posiciones y normales correctamente; invertir winding si el determinante de S es negativo.',
        'scene_conversion':'Aplicar scale_to_scene una sola vez a vertices y pivotes root-rest.'},
      'landmarks_H':{'sole':0,'ankle_reference':.055,'knee':.255,'hip':.450,'arm_shoulder':.680,'torso_center_top':.700,'head_pivot':.700,'chin':.720,'hair_top':1.0,'head_with_hair_height':.280,'torso_shoulder_width':.260},
      'rig':[{'id':i,'parent':p,'rest_position_root_H':v} for i,p,v in rig],
      'instances':inst,'budget':{'max_triangles':280,'actual_triangles':None,'reserve_triangles':0,'includes':'Todas las 33 instancias de este archivo; no incluye sombra, auxiliares de renderizado ni accesorios nuevos.'},
      'assembly_policy':{'authoritative':'Las matrices root-rest de las instancias son autoritativas; sockets derivados para montaje/inspección.',
        'geometry_type':'Malla de apoyo reproducible; las ilustraciones son referencia artística.',
        'rigid_skinning':'Una influencia no nula por vértice; cada panel pertenece al mismo hueso.',
        'part_identity':'Conservar rangos de índices/IDs como metadatos, sin crear obligatoriamente una Mesh por pieza.',
        'pose_rule':'Aplicar transformaciones delta respecto a rest; no acumular rotaciones por frame.'},
      'constraints':{'min_layer_normal_gap_scene':.004,'requires_pose_validation':True,'production_integrated':False,
        'validated_scope':'Geometría estática, relaciones numéricas y uniones básicas en reposo; no certifica colisiones de poses ni FPS.'},
      'poses_proposed':[{'name':'reposo','angles_deg':{}},{'name':'caminar','description':'Usar POSES actual; revisar cuatro fases y transiciones.'},{'name':'sentado','description':'Adaptar POSES y altura de asiento vigentes; revisar pelvis, rodillas y mangas.'},{'name':'trabajo-en-mesa','description':'Usar alcance actual; revisar manos, correas y frontal de torso.'}]}
    byid={p['id']:p for p in parts}; bi={i['id']:i for i in inst}
    for i in inst:
        parent=i['mount']['parent_instance_id']
        if parent:
            anchor='mount_'+i['id'].replace('-','_'); par=bi[parent]
            # Parent instance transforms are identity/translation except reflected pairs; inverse applies explicitly.
            local=inverse_transform(i['position_H'],par)
            i['mount']['target_socket']=anchor
            byid[par['part_id']]['sockets'][anchor]={'position_local_H':local,'description':'Anclaje derivado en reposo para '+i['id']+'. Ver instancia padre '+parent+'.','instance_scope':parent}
    assembly['budget']['actual_triangles']=sum(len(byid[i['part_id']]['mesh']['faces']) for i in inst)
    return parts,assembly

def rot(v,deg):
    x,y,z=v; a,b,c=[math.radians(q) for q in deg]
    y,z=y*math.cos(a)-z*math.sin(a),y*math.sin(a)+z*math.cos(a)
    x,z=x*math.cos(b)+z*math.sin(b),-x*math.sin(b)+z*math.cos(b)
    x,y=x*math.cos(c)-y*math.sin(c),x*math.sin(c)+y*math.cos(c)
    return [x,y,z]
def transform(v,i):
    s=i['scale_xyz']; q=[v[k]*s[k]*(-1 if k==0 and i['mirror_x'] else 1) for k in range(3)]
    return add(rot(q,i['rotation_deg_xyz']),i['position_H'])
def inverse_transform(v,i):
    q=sub(v,i['position_H']); x,y,z=q; a,b,c=[-math.radians(v) for v in i['rotation_deg_xyz']]
    x,y=x*math.cos(c)-y*math.sin(c),x*math.sin(c)+y*math.cos(c)
    x,z=x*math.cos(b)+z*math.sin(b),-x*math.sin(b)+z*math.cos(b)
    y,z=y*math.cos(a)-z*math.sin(a),y*math.sin(a)+z*math.cos(a)
    q=[x,y,z]; return [q[k]/i['scale_xyz'][k]*(-1 if k==0 and i['mirror_x'] else 1) for k in range(3)]

def assembled(parts,assembly,explode=False):
    byid={p['id']:p for p in parts}; vs=[]; fs=[]; colors=[]; face_owner=[]; two_sided=[]
    # Only a pedagogical exploded view, never a replacement for assembly transforms.
    shifts={'P01':[0,.12,.08],'P02':[0,.07,0],'P03':[.14,.12,0],'P04':[.03,.12,.22],'P05':[0,.06,.23],
      'P06':[0,.25,-.025],'P07':[.03,.19,.17],'P08':[0,0,0],'P09':[0,0,.22],'P10':[.04,.07,.16],
      'P11':[.13,.03,0],'P12':[.17,-.015,0],'P13':[.20,-.05,0],'P14':[.22,-.08,0],
      'P15':[0,-.04,0],'P16':[.05,-.09,0],'P17':[.07,-.13,0],'P18':[.08,-.17,.06],'P19':[0,0,-.26],'P20':[.11,.04,-.12]}
    for i in assembly['instances']:
        p=byid[i['part_id']]; k=len(vs); points=[transform(v,i) for v in p['mesh']['vertices']]
        if explode:
            s=shifts[i['part_id']][:]
            if i['id'].endswith('-R'): s[0]*=-1
            points=[add(v,s) for v in points]
        vs+=points
        flip=math.prod(i['scale_xyz'])*(-1 if i['mirror_x'] else 1)<0
        faces=[f[::-1] if flip else f for f in p['mesh']['faces']]
        fs += [[j+k for j in f] for f in faces]; colors+=p['mesh']['face_colors']; face_owner += [i['id']]*len(faces);two_sided += [p['metadata']['surface_kind']!='closed']*len(faces)
    return {'vertices':vs,'faces':fs,'face_colors':colors,'face_owner':face_owner,'face_double_sided_preview':two_sided}

def validate(parts,assembly,compare_stored=True):
    errors=[]; checks=[]; byid={p['id']:p for p in parts}
    # Reject malformed author edits before any geometry operation or projection.
    fatal=[]
    for p in parts:
        try:
            vs=p['mesh']['vertices'];fs=p['mesh']['faces']
            good_vertices=bool(vs) and all(len(v)==3 and all(isinstance(x,(int,float)) and not isinstance(x,bool) and math.isfinite(x) for x in v) for v in vs)
            if not good_vertices: fatal.append(p['id']+':vertices_invalidos')
            if not fs or any(len(f)!=3 or any(not isinstance(j,int) or isinstance(j,bool) or j<0 or j>=len(vs) for j in f) for f in fs): fatal.append(p['id']+':indices_invalidos')
        except (KeyError,TypeError,ValueError): fatal.append(str(p.get('id','desconocida'))+':estructura_invalida')
    for i in assembly['instances']:
        try:
            if any(len(i[k])!=3 or not all(isinstance(x,(int,float)) and math.isfinite(x) for x in i[k]) for k in ('position_H','rotation_deg_xyz','scale_xyz')) or any(abs(x)<1e-10 for x in i['scale_xyz']): fatal.append(i['id']+':transform_invalido')
            if i['part_id'] not in byid: fatal.append(i['id']+':pieza_inexistente')
        except (KeyError,TypeError,ValueError): fatal.append(str(i.get('id','desconocida'))+':estructura_instancia_invalida')
    if fatal:
        return {'schema_version':'2.0','input_mode':'delivered_json','all_passed':False,'errors':fatal,'parts':[], 'verified':['Preflight de formato y valores finitos'],'not_verified':['Todas las operaciones geométricas: entrada inválida.']}
    if len(byid)!=20: errors.append('Se esperan 20 IDs de pieza únicos.')
    for p in parts:
        m=p['mesh']; vs=m['vertices']; fs=m['faces']; local=[]
        if not vs or any(len(v)!=3 or not all(isinstance(x,(int,float)) and math.isfinite(x) for x in v) for v in vs):
            local.append('vertices_invalidos')
        edge=collections.defaultdict(list); dup=set(); minarea=math.inf
        for k,f in enumerate(fs):
            if len(f)!=3 or len(set(f))!=3 or any(not isinstance(x,int) or x<0 or x>=len(vs) for x in f): local.append('indices_invalidos');continue
            a,b,c=[vs[j] for j in f]; ar=norm(cross(sub(b,a),sub(c,a)))/2; minarea=min(minarea,ar)
            if ar<1e-12: local.append('cara_degenerada')
            signature=tuple(sorted(tuple(round(q,12) for q in vs[j]) for j in f))
            if signature in dup: local.append('cara_duplicada')
            dup.add(signature)
            for u,v in zip(f,f[1:]+f[:1]): edge[tuple(sorted((u,v)))].append((u,v))
        if any(len(e)>2 for e in edge.values()): local.append('arista_no_manifold')
        if any(len(e)==2 and e[0]==e[1] for e in edge.values()): local.append('winding_inconsistente')
        boundary=sum(len(e)==1 for e in edge.values()); closed=p['metadata']['surface_kind']=='closed'
        if closed and boundary: local.append('solido_con_bordes_abiertos')
        volume=sum(dot(vs[f[0]],cross(vs[f[1]],vs[f[2]]))/6 for f in fs)
        if closed and volume<=0: local.append('volumen_cerrado_no_positivo')
        if len(m['face_colors'])!=len(fs): local.append('colores_no_coinciden')
        bb=bounds(vs)
        if compare_stored:
            if p['metadata']['triangles']!=len(fs): local.append('conteo_guardado_obsoleto')
            if any(abs(bb[k][j]-p['metadata']['bounds_local_H'][k][j])>1e-10 for k in bb for j in range(3)): local.append('bounds_guardados_obsoletos')
        checks.append({'id':p['id'],'triangles':len(fs),'vertices':len(vs),'boundary_edges':boundary,'surface_kind':p['metadata']['surface_kind'],'min_triangle_area_H2':minarea,'signed_volume_H3':volume if closed else None,'passed':not local,'errors':sorted(set(local))})
        errors += [p['id']+':'+e for e in sorted(set(local))]
    rigs={r['id']:r for r in assembly['rig']}; expect={'root','hips','torso','head','armL','armR','foreL','foreR','legL','legR','shinL','shinR'}
    if set(rigs)!=expect: errors.append('rig_ids_no_coinciden')
    expected_parents={'root':None,'hips':'root','torso':'hips','head':'torso','armL':'torso','armR':'torso','foreL':'armL','foreR':'armR','legL':'hips','legR':'hips','shinL':'legL','shinR':'legR'}
    for ident,r in rigs.items():
        if r['parent']!=expected_parents.get(ident): errors.append(ident+':padre_rig_no_compatible')
        if len(r['rest_position_root_H'])!=3 or not all(isinstance(q,(int,float)) and math.isfinite(q) for q in r['rest_position_root_H']): errors.append(ident+':pivote_rig_invalido')
    for b in rigs:
        seen=set(); cur=b
        while cur:
            if cur in seen or cur not in rigs: errors.append('rig_ciclo_o_padre_invalido');break
            seen.add(cur);cur=rigs[cur]['parent']
    ii={i['id']:i for i in assembly['instances']}
    if len(ii)!=len(assembly['instances']): errors.append('instancias_ids_duplicados')
    if len(ii)!=33: errors.append('numero_instancias_distinto_de_33')
    socket_errors=[]
    for i in assembly['instances']:
        if i['part_id'] not in byid or i['bone'] not in rigs: errors.append('instancia_referencia_invalida');continue
        if any(not math.isfinite(q) for k in ('position_H','rotation_deg_xyz','scale_xyz') for q in i[k]) or any(abs(q)<1e-10 for q in i['scale_xyz']): errors.append('transform_invalido')
        parent=i['mount'].get('parent_instance_id')
        if parent:
            if parent not in ii: socket_errors.append(i['id']);continue
            par=ii[parent]; socket=byid[par['part_id']]['sockets'].get(i['mount'].get('target_socket'))
            if not socket or norm(sub(transform(socket['position_local_H'],par),i['position_H']))>1e-10: socket_errors.append(i['id'])
    if socket_errors: errors.append('sockets_de_montaje_inconsistentes')
    # Narrow, explicit plane-gap checks; these are not general collision tests.
    layer_checks=[]
    for ident,base in [('P04-L','P01'),('P04-R','P01'),('P05','P01'),('P09','P08'),('P10-L','P09'),('P10-R','P09')]:
        inst=ii[ident]; par=ii[base]; pm=byid[par['part_id']]['mesh']
        if base=='P01': plane_ids=[0,1,7]
        elif base=='P08': plane_ids=[0,1,9]
        else: plane_ids=pm['faces'][0]
        a,b,c=[transform(pm['vertices'][j],par) for j in plane_ids]
        normal=cross(sub(b,a),sub(c,a))
        if norm(normal)<1e-12:
            errors.append(base+':plano_de_apoyo_degenerado');continue
        n=unit(normal)
        if n[2]<0: n=mul(n,-1)
        distances=[dot(sub(transform(v,inst),a),n)*assembly['scale_to_scene'] for v in byid[inst['part_id']]['mesh']['vertices']]
        minimum=min(distances);ok=minimum>=assembly['constraints']['min_layer_normal_gap_scene']-1e-10
        layer_checks.append({'instance':ident,'reference_plane':base,'min_normal_distance_scene':minimum,'passed':ok})
        if not ok: errors.append(ident+':separacion_normal_insuficiente')
    mesh=assembled(parts,assembly); bb=bounds(mesh['vertices']); actual=len(mesh['faces'])
    if actual>assembly['budget']['max_triangles']: errors.append('presupuesto_superado')
    if actual!=assembly['budget']['actual_triangles']: errors.append('conteo_assembly_obsoleto')
    if abs(bb['min'][1])>1e-10 or abs(bb['max'][1]-1)>1e-10: errors.append('altura_final_no_es_H')
    return {'schema_version':'2.0','input_mode':'delivered_json','all_passed':not errors,'part_count':len(parts),'instance_count':len(ii),'triangles_total':actual,'bounds_root_H':bb,'height_scene':bb['size'][1]*assembly['scale_to_scene'],'sockets_mismatched':socket_errors,'layer_plane_checks':layer_checks,'parts':checks,'errors':sorted(set(errors)),
      'verified':['Lectura de los JSON entregados','Índices y coordenadas finitas','Área positiva por triángulo','Ausencia de duplicados geométricos exactos dentro de cada pieza','Coherencia de winding por arista interior','Cierre y volumen positivo solo para piezas declaradas cerradas','Conteo y bounds almacenados contra recálculo','12 huesos y jerarquía sin ciclos','Transformaciones de 33 instancias y correspondencia de anclajes','Altura montada y presupuesto','Distancia normal a planos de apoyo de ojos, sonrisa, pechera y solapas'],
      'not_verified':['Ausencia global de intersecciones entre piezas','Colisiones durante animación','Cobertura de todas las articulaciones en todas las poses','Identidad pixel a pixel con las ilustraciones','Integración en el builder real','Rendimiento CPU/GPU o FPS']}

def esc(s): return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def txt(x,y,s,size=18,color='#321853',weight=400): return f'<text x="{x}" y="{y}" font-family="DejaVu Sans,sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}">{esc(s)}</text>'
def basis(n):
    n=unit(n)
    if abs(n[1])>.99: u=[1,0,0];v=[0,0,-1 if n[1]>0 else 1]
    else: u=unit(cross([0,1,0],n));v=cross(n,u)
    return u,v,n
VIEWS=[('FRENTE · +Z',[0,0,1]),('ESPALDA · −Z',[0,0,-1]),('IZQUIERDA ANATÓMICA · +X',[1,0,0]),('DERECHA ANATÓMICA · −X',[-1,0,0]),('ARRIBA · +Y',[0,1,0]),('ABAJO · −Y',[0,-1,0]),('ISOMÉTRICA',[1,.72,1])]
def drawing(mesh,n,x,y,w,h,common_span=None,labels=False):
    u,v,n=basis(n); ps=[[dot(p,u),dot(p,v),dot(p,n)] for p in mesh['vertices']]
    ext=bounds(ps); cx=(ext['min'][0]+ext['max'][0])/2;cy=(ext['min'][1]+ext['max'][1])/2
    if common_span: k=min(w,h)*.82/common_span
    else: k=min(w*.88/max(ext['size'][0],1e-8),h*.88/max(ext['size'][1],1e-8))
    pp=[(x+w/2+(p[0]-cx)*k,y+h/2-(p[1]-cy)*k) for p in ps]
    out=[]; light=unit([-.3,.7,1]); faces=[]
    for j,f in enumerate(mesh['faces']):
        a,b,c=[mesh['vertices'][i] for i in f]; nn=unit(cross(sub(b,a),sub(c,a)))
        if 'face_double_sided_preview' in mesh and not mesh['face_double_sided_preview'][j] and dot(nn,n)<-1e-9: continue
        col=shade(mesh['face_colors'][j],.92+.13*abs(dot(nn,light)))
        z=sum(ps[i][2] for i in f)/3;faces.append((z,j,f,col))
    for _,j,f,col in sorted(faces):
        pts=' '.join(f'{pp[i][0]:.2f},{pp[i][1]:.2f}' for i in f)
        luminance=sum(int(col[k:k+2],16) for k in (1,3,5))/3
        edge_color='#D4BCEB' if luminance<85 else '#2B2340'
        opacity='.52' if luminance<85 else '.42'
        out.append(f'<polygon points="{pts}" fill="{col}" stroke="{edge_color}" stroke-width=".8" stroke-opacity="{opacity}" stroke-linejoin="round"/>')
    if labels:
        for j,(xx,yy) in enumerate(pp): out.append(txt(xx+4,yy-4,str(j),12,'#8B365F',700).replace('<text ','<text stroke="#FFFFFF" stroke-width="3" paint-order="stroke fill" '))
    return ''.join(out)

def sheet(part,assembly):
    m=part['mesh']; b=bounds(m['vertices']); span=max(b['size'])*1.12
    out=['<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1120" viewBox="0 0 1600 1120">','<rect width="1600" height="1120" fill="#F7F4FA"/>']
    out += [txt(40,47,part['id']+' · '+part['name'].upper(),30,weight=700),txt(40,80,'GUATE GEEKS / PRIMARIA R2 · Proyecciones de la geometría numérica de apoyo',16,color='#6A577B')]
    for j,(label,n) in enumerate(VIEWS):
        x=28+(j%4)*393;y=108+(j//4)*432
        out.append(f'<rect x="{x}" y="{y}" width="380" height="416" rx="14" fill="white" stroke="#DFD6E8"/>')
        out.append(txt(x+16,y+28,label,15,weight=700))
        out.append(drawing(m,n,x+12,y+43,356,343,span,labels=j==6 and len(m['vertices'])<=12))
        out.append(txt(x+16,y+398,'Misma escala entre vistas ortogonales',12,color='#7A6E84'))
    x=1207;y=540
    out.append(f'<rect x="{x}" y="{y}" width="380" height="416" rx="14" fill="#EEE7F5"/>')
    out.append(txt(x+18,y+30,'DATOS DE MONTAJE',17,weight=700))
    yy=y+65
    kind_label={'closed':'volumen cerrado','open':'superficie abierta','planar':'aplique plano'}[part['metadata']['surface_kind']]
    infos=[f'Vértices: {len(m["vertices"])}',f'Triángulos por pieza: {len(m["faces"])}',f'Tipo: {kind_label}',
      f'Ancho X: {b["size"][0]:.5f} H',f'Alto Y: {b["size"][1]:.5f} H',f'Profundidad Z: {b["size"][2]:.5f} H','Escala final: H = 0.78','L/R = lados del personaje']
    for line in infos: out.append(txt(x+18,yy,line,16));yy+=29
    out.append(txt(x+18,yy+8,'Origen y vértices: datos/'+part['id'],14,weight=600))
    out.append(txt(x+18,yy+34,'Transformación: datos/assembly.json',13))
    out.append(txt(40,1004,'Los PNG artísticos orientan el acabado; estos planos y los JSON definen la malla de apoyo.',17,weight=600))
    out.append(txt(40,1037,'Superficies planas o abiertas se muestran por ambas caras en esta lámina. No se añade espesor ni geometría.',15,color='#6A577B'))
    out.append(txt(40,1070,'Unidades H relativas a la altura completa · +Y arriba · +Z frente · +X izquierda anatómica · sin UV/texturas',15,color='#6A577B'))
    out.append('</svg>');return ''.join(out)

def assembly_sheet(parts,assembly,exploded=False):
    mesh=assembled(parts,assembly,explode=exploded); title='DESPIECE Y MONTAJE' if exploded else 'PERSONAJE MONTADO'
    out=['<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1200" viewBox="0 0 1800 1200"><rect width="1800" height="1200" fill="#F7F4FA"/>']
    out += [txt(40,48,'GUATE GEEKS · '+title+' · PRIMARIA R2',30,weight=700),txt(40,82,'20 familias / 33 instancias / '+str(len(mesh['faces']))+' triángulos de apoyo · H = 0.78',19,color='#6A577B')]
    views=[('FRENTE',[0,0,1]),('PERFIL IZQUIERDO',[1,0,0]),('ESPALDA',[0,0,-1]),('TRES CUARTOS',[1,.65,1])]
    for j,(label,n) in enumerate(views):
        x=25+j*444; y=113
        out.append(f'<rect x="{x}" y="{y}" width="431" height="850" rx="16" fill="white" stroke="#DFD6E8"/>')
        out.append(txt(x+20,y+34,label,20,weight=700));out.append(drawing(mesh,n,x+14,y+60,403,735))
    note='Separaciones ilustrativas de inspección; ensamblar con las transformaciones de assembly.json.' if exploded else 'Malla numérica de apoyo en reposo. Validar articulaciones, silueta y acabado en el renderizador del cotizador.'
    out.append(txt(40,1012,note,18,weight=600))
    out.append(txt(40,1050,'Piezas cerradas: cabeza, cuello, orejas, brazos, antebrazos, manos, muslos, pantorrillas, zapatos y mochila.',16))
    out.append(txt(40,1084,'Piezas abiertas/planas: cabello, mechones, torso inferior, mangas, pelvis, ojos, sonrisa, pechera, solapas y tirantes.',16))
    out.append(txt(40,1122,'Los huecos intencionales se detallan en los JSON. La validación estática no certifica todas las poses ni el rendimiento.',16,color='#6A577B'))
    out.append('</svg>');return ''.join(out)

VIEW_FILES=['frente','espalda','izquierda','derecha','superior','inferior','tres-cuartos']
def individual_view(part,label,n):
    b=part['metadata']['bounds_local_H']; span=max(b['size'])*1.12
    out=['<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#F7F4FA"/>']
    out += [txt(28,42,part['id']+' · '+part['name'],25,weight=700),txt(28,77,label,19,color='#6A577B',weight=600),'<rect x="24" y="104" width="752" height="602" rx="14" fill="white" stroke="#DFD6E8"/>']
    out.append(drawing(part['mesh'],n,45,125,710,555,span))
    out.append(txt(28,743,f'Geometría de apoyo · {len(part["mesh"]["faces"])} triángulos · H = 0.78',16,weight=600))
    out.append(txt(28,774,'Vistas de una pieza aislada, con la misma escala entre proyecciones.',14,color='#6A577B'))
    out.append('</svg>');return ''.join(out)

def read_inputs(root):
    parts=[json.loads(p.read_text()) for p in sorted((root/'datos').glob('P[0-9][0-9]-*.json'))]
    return parts,json.loads((root/'datos/assembly.json').read_text())
def write_json(path,data): path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def run(root,write_presets=False,png=False,validate_only=False,views=False):
    if not validate_only:
        for d in ('datos','planos','herramientas'): (root/d).mkdir(parents=True,exist_ok=True)
    if write_presets:
        parts,assembly=presets()
        for p in parts: write_json(root/'datos'/(p['slug']+'.json'),p)
        write_json(root/'datos/assembly.json',assembly)
    parts,assembly=read_inputs(root); report=validate(parts,assembly)
    if validate_only:
        print(json.dumps(report,ensure_ascii=False,indent=2));return 0 if report['all_passed'] else 1
    write_json(root/'VALIDACION-GEOMETRICA.json',report)
    if not report['all_passed']:
        print(json.dumps(report,ensure_ascii=False,indent=2));return 1
    for p in parts: (root/'planos'/(p['slug']+'.svg')).write_text(sheet(p,assembly))
    (root/'planos/00-personaje-montado.svg').write_text(assembly_sheet(parts,assembly))
    (root/'planos/21-despiece-montaje.svg').write_text(assembly_sheet(parts,assembly,True))
    catalog={'id':assembly['id'],'scale_to_scene':H,'total_triangles':report['triangles_total'],'instance_count':len(assembly['instances']),
      'parts':[{'id':p['id'],'name':p['name'],'slug':p['slug'],'file':p['slug']+'.json','triangles_per_instance':p['metadata']['triangles'],'instances':[i['id'] for i in assembly['instances'] if i['part_id']==p['id']],'surface_kind':p['metadata']['surface_kind'],'dimensions_local_H':p['metadata']['bounds_local_H']['size'],'dimensions_scene':p['metadata']['dimensions_scene']} for p in parts]}
    write_json(root/'datos/catalogo.json',catalog)
    if png or views:
        exe=shutil.which('inkscape')
        if not exe: raise RuntimeError('Se requiere Inkscape local para --png; SVG/JSON no necesitan dependencias.')
    if png:
        for svg in sorted((root/'planos').glob('*.svg')):
            subprocess.run([exe,str(svg),'--export-type=png','--export-filename='+str(svg.with_suffix('.png'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if views:
        for p in parts:
            target=root/'vistas'/p['slug'];target.mkdir(parents=True,exist_ok=True)
            for slug,(label,n) in zip(VIEW_FILES,VIEWS):
                subprocess.run([exe,'--pipe','--export-type=png','--export-filename='+str(target/(slug+'.png'))],input=individual_view(p,label,n),text=True,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    print(json.dumps({'all_passed':True,'parts':len(parts),'instances':len(assembly['instances']),'triangles':report['triangles_total'],'height_scene':report['height_scene'],'root':str(root)},ensure_ascii=False));return 0

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=pathlib.Path,default=ROOT);ap.add_argument('--presets',action='store_true',help='Restablece y sobrescribe explícitamente recetas originales R2.');ap.add_argument('--png',action='store_true');ap.add_argument('--views',action='store_true');ap.add_argument('--validate-only',action='store_true');args=ap.parse_args()
    if args.presets and args.validate_only: ap.error('--presets no se combina con --validate-only')
    raise SystemExit(run(args.root,args.presets,args.png,args.validate_only,args.views))
