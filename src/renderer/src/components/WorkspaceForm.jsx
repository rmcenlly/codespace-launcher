import { useState } from 'react'
import { basename, extname } from '../utils/path'
import { slugify } from '../utils/slugify'
import '../styles/WorkspaceForm.css'

export default function WorkspaceForm({ mode, isChild, initial, onSave, onCancel }) {
  const [path, setPath] = useState(initial?.path ?? '')
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [nameTouched, setNameTouched] = useState(!!initial?.name)

  function deriveName(p) {
    if (!p) return ''
    const base = basename(p)
    return base.endsWith('.code-workspace') ? base.slice(0, -'.code-workspace'.length) : base
  }

  function deriveType(p) {
    return p.endsWith('.code-workspace') ? 'workspace' : 'folder'
  }

  async function browseFolder() {
    const { canceled, filePaths } = await window.api.dialog.showOpenDialog({
      properties: ['openDirectory', 'multiSelections']
    })
    if (canceled) return
    if (filePaths.length > 1) {
      onSave(filePaths.map((p) => ({
        id: slugify(deriveName(p)),
        name: deriveName(p),
        path: p,
        type: 'folder',
        icon: null,
        children: []
      })))
      return
    }
    const p = filePaths[0]
    setPath(p)
    if (!nameTouched) setName(deriveName(p))
  }

  async function browseWorkspaceFile() {
    const result = await window.api.dialog.openPath({ workspaceFile: true })
    if (!result) return
    setPath(result)
    if (!nameTouched) setName(deriveName(result))
  }

  async function browseIcon() {
    const result = await window.api.dialog.openPath({ image: true })
    if (result) setIcon(result)
  }

  function handleNameChange(e) {
    setName(e.target.value)
    setNameTouched(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!path || !name) return

    const resolvedName = name || deriveName(path)
    const id = initial?.id ?? slugify(resolvedName)

    const data = {
      id,
      name: resolvedName,
      path,
      type: deriveType(path),
      ...(isChild ? {} : { icon: icon || null }),
      children: initial?.children ?? []
    }

    onSave(data)
  }

  return (
    <div className="form-overlay">
      <div className="form-dialog">
        <h2>{mode === 'add' ? 'Add' : 'Edit'} {isChild ? 'Child ' : ''}Workspace</h2>

        <form onSubmit={handleSubmit}>
          <label>
            Path
            <div className="input-row">
              <input
                type="text"
                value={path}
                onChange={(e) => {
                  setPath(e.target.value)
                  if (!nameTouched) setName(deriveName(e.target.value))
                }}
                placeholder="Folder or .code-workspace file"
                required
              />
              <button type="button" className="btn-browse" onClick={browseFolder}>
                Folder
              </button>
              <button type="button" className="btn-browse" onClick={browseWorkspaceFile}>
                .code-workspace
              </button>
            </div>
          </label>

          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Workspace name"
              required
            />
          </label>

          {!isChild && (
            <label>
              Icon <span className="label-hint">(optional — leave empty for auto-resolve)</span>
              <div className="input-row">
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="Path to image file"
                />
                <button type="button" className="btn-browse" onClick={browseIcon}>
                  Browse
                </button>
              </div>
            </label>
          )}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {mode === 'add' ? 'Add' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
