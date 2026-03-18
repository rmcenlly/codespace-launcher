// Renderer-safe path utilities (can't use Node's 'path' in renderer)

export function basename(p) {
  return p.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? ''
}

export function extname(p) {
  const base = basename(p)
  const dot = base.lastIndexOf('.')
  return dot >= 0 ? base.slice(dot) : ''
}
