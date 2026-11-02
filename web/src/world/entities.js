// Pure diff between what exists and what the plan wants, keyed by stable module keys.
export function signatureOf(module) {
  return [module.asset, module.x, module.y, module.z, module.rot, module.population ?? '', module.programId ?? ''].join('|');
}

export function diffEntities(current, modules) {
  const wanted = new Set(modules.map(module => module.key));
  const add = [], keep = [], remove = [...current.keys()].filter(key => !wanted.has(key));
  for (const module of modules) {
    const existing = current.get(module.key);
    if (!existing) add.push(module);
    else if (existing.signature === signatureOf(module)) keep.push(module);
    else { remove.push(module.key); add.push(module); }
  }
  return { add, keep, remove };
}
