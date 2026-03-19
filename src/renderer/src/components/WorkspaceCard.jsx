import { useState, useEffect } from 'react'
import '../styles/WorkspaceCard.css'
import workspaceIconSvgTemplate from '../assets/workspace-icon.svg?raw'

function hueFromIndex(index) {
  const group = Math.floor(index / 3)
  const member = index % 3
  return (group * 30 + member * 120) % 360
}

function makeFallbackUrl(index) {
  const hue = hueFromIndex(index)
  const svg = workspaceIconSvgTemplate.replaceAll('{{HUE}}', String(hue))
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function WorkspaceIcon({ workspace }) {
  const [dataUrl, setDataUrl] = useState(null)

  const resolve = () =>
    window.api.workspace.resolveIcon(workspace).then((url) => setDataUrl(url ?? null))

  useEffect(() => {
    resolve()
    // Re-check when the launcher window regains focus — covers the case where
    // the user adds an icon file to the icons folder while the app is open.
    window.addEventListener('focus', resolve)
    return () => window.removeEventListener('focus', resolve)
  }, [workspace.id, workspace.icon])

  if (dataUrl) {
    return <img src={dataUrl} alt="" className="card-icon" />
  }

  return <img src={makeFallbackUrl(workspace.colorIndex ?? 0)} alt="" className="card-icon" />
}

function ChildCard({ child, rootWorkspace, onLaunch, onAddChild, onEdit, onDelete }) {
  const [accordionOpen, setAccordionOpen] = useState(false)
  const hasChildren = child.children && child.children.length > 0

  function handleAddChild() {
    if (hasChildren && !accordionOpen) setAccordionOpen(true)
    onAddChild(child.id)
  }

  return (
    <div className="child-card">
      <div className="card-main">
        <div className="card-info">
          <span className="card-name">{child.name}</span>
          <span className="card-path">{child.path}</span>
        </div>
        <div className="card-actions">
          <button className="btn-launch" onClick={() => onLaunch(child, rootWorkspace)} title="Open in VSCode">
            ▶
          </button>
          <button className="btn-icon" onClick={() => onEdit(child, child.id)} title="Edit">
            ✎
          </button>
          <button className="btn-icon btn-danger" onClick={() => onDelete(child.id)} title="Delete">
            ✕
          </button>
          {hasChildren && (
            <button
              className={`btn-icon btn-accordion ${accordionOpen ? 'open' : ''}`}
              onClick={() => setAccordionOpen((v) => !v)}
              title={accordionOpen ? 'Collapse' : 'Expand children'}
            >
              ▾
            </button>
          )}
        </div>
      </div>

      {hasChildren && accordionOpen && (
        <div className="card-children">
          {child.children.map((grandchild) => (
            <ChildCard
              key={grandchild.id}
              child={grandchild}
              rootWorkspace={rootWorkspace}
              onLaunch={onLaunch}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <div className="card-footer">
        <button className="btn-add-child" onClick={handleAddChild}>
          + Add child workspace
        </button>
      </div>
    </div>
  )
}

export default function WorkspaceCard({ workspace, onLaunch, onAddChild, onEdit, onDelete }) {
  const [accordionOpen, setAccordionOpen] = useState(false)
  const hasChildren = workspace.children && workspace.children.length > 0

  function handleAddChild() {
    if (hasChildren && !accordionOpen) setAccordionOpen(true)
    onAddChild(workspace.id)
  }

  return (
    <div className="workspace-card">
      <div className="card-main">
        <div className="card-icon-wrap">
          <WorkspaceIcon workspace={workspace} />
        </div>

        <div className="card-info">
          <span className="card-name">{workspace.name}</span>
          <span className="card-path">{workspace.path}</span>
        </div>

        <div className="card-actions">
          <button className="btn-launch" onClick={() => onLaunch(workspace, null)} title="Open in VSCode">
            ▶
          </button>
          <button className="btn-icon" onClick={() => onEdit(workspace, null)} title="Edit">
            ✎
          </button>
          <button className="btn-icon btn-danger" onClick={() => onDelete(workspace.id)} title="Delete">
            ✕
          </button>
          {hasChildren && (
            <button
              className={`btn-icon btn-accordion ${accordionOpen ? 'open' : ''}`}
              onClick={() => setAccordionOpen((v) => !v)}
              title={accordionOpen ? 'Collapse' : 'Expand children'}
            >
              ▾
            </button>
          )}
        </div>
      </div>

      {hasChildren && (
        <div className={`card-children-wrap ${accordionOpen ? 'open' : ''}`}>
          <div className="card-children">
            <div className="card-children-inner">
            {workspace.children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                rootWorkspace={workspace}
                onLaunch={onLaunch}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            </div>
          </div>
        </div>
      )}

      <div className="card-footer">
        <button className="btn-add-child" onClick={handleAddChild}>
          + Add child workspace
        </button>
      </div>
    </div>
  )
}
