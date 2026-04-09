import { useState, useEffect } from 'react'
import WorkspaceGrid from './components/WorkspaceGrid'
import WorkspaceForm from './components/WorkspaceForm'
import ConfirmDialog from './components/ConfirmDialog'
import UpdateBanner from './components/UpdateBanner'
import SettingsDialog from './components/SettingsDialog'
import './styles/App.css'
import './styles/SettingsDialog.css'

export default function App() {
  const [settings, setSettings] = useState({ workspaces: [] })
  const [formState, setFormState] = useState(null) // null | { mode: 'add' | 'edit', parentId?: string, workspace?: object }
  const [confirmState, setConfirmState] = useState(null) // null | { id: string, name: string }
  const [updateState, setUpdateState] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    window.api.settings.read().then(setSettings)
  }, [])

  useEffect(() => {
    window.api.updater.onUpdateAvailable((info) =>
      setUpdateState({ phase: 'available', version: info.version })
    )
    window.api.updater.onDownloadProgress((data) =>
      setUpdateState({ phase: 'downloading', percent: data.percent })
    )
    window.api.updater.onUpdateDownloaded(() =>
      setUpdateState({ phase: 'ready' })
    )
    window.api.updater.onError(() =>
      setUpdateState({ phase: 'error' })
    )
    return () => window.api.updater.removeAllListeners()
  }, [])

  async function saveSettings(updated) {
    await window.api.settings.write(updated)
    // Re-read so the main process can assign/clear colorIndex based on resolved icons
    const refreshed = await window.api.settings.read()
    setSettings(refreshed)
  }

  async function handleSettingsSave(updated) {
    await saveSettings(updated)
    setSettingsOpen(false)
  }

  function addChildTo(nodes, parentId, child) {
    return nodes.map((n) => {
      if (n.id === parentId) return { ...n, children: [...(n.children ?? []), child] }
      if (n.children?.length) return { ...n, children: addChildTo(n.children, parentId, child) }
      return n
    })
  }

  function updateNode(nodes, id, data) {
    return nodes.map((n) => {
      if (n.id === id) return data
      if (n.children?.length) return { ...n, children: updateNode(n.children, id, data) }
      return n
    })
  }

  function removeNode(nodes, id) {
    return nodes
      .filter((n) => n.id !== id)
      .map((n) =>
        n.children?.length ? { ...n, children: removeNode(n.children, id) } : n
      )
  }

  function handleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleOpenSelected() {
    for (const id of selectedIds) {
      const ws = findNode(settings.workspaces, id)
      if (ws) window.api.workspace.launch(ws, null)
    }
    setSelectedIds(new Set())
  }

  function openAddForm(parentId = null) {
    setFormState({ mode: 'add', parentId })
  }

  function openEditForm(workspace, parentId = null) {
    setFormState({ mode: 'edit', parentId, workspace })
  }

  function closeForm() {
    setFormState(null)
  }

  async function handleFormSave(data) {
    const items = Array.isArray(data) ? data : [data]
    let updated = { ...settings }

    for (const item of items) {
      if (formState.parentId) {
        if (formState.mode === 'add') {
          updated.workspaces = addChildTo(updated.workspaces, formState.parentId, item)
        } else {
          updated.workspaces = updateNode(updated.workspaces, item.id, item)
        }
      } else {
        if (formState.mode === 'add') {
          updated.workspaces = [...updated.workspaces, item]
        } else {
          updated.workspaces = updateNode(updated.workspaces, item.id, item)
        }
      }
    }

    await saveSettings(updated)
    closeForm()
  }

  function findNode(nodes, id) {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children?.length) {
        const found = findNode(n.children, id)
        if (found) return found
      }
    }
    return null
  }

  function handleDelete(workspaceId) {
    const ws = findNode(settings.workspaces, workspaceId)
    setConfirmState({ id: workspaceId, name: ws?.name ?? workspaceId })
  }

  async function confirmDelete() {
    const updated = { ...settings }
    updated.workspaces = removeNode(updated.workspaces, confirmState.id)
    await saveSettings(updated)
    setConfirmState(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Codespace Launcher</h1>
        {updateState && (
          <UpdateBanner
            updateState={updateState}
            onDownload={() => window.api.updater.startDownload()}
            onInstall={() => window.api.updater.quitAndInstall()}
            onDismiss={() => setUpdateState(null)}
          />
        )}
        <div className="header-actions">
          {selectedIds.size > 0 && (
            <button className="btn-outline" onClick={handleOpenSelected}>
              Open Selected ({selectedIds.size})
            </button>
          )}
          <button className="btn-cog" onClick={() => setSettingsOpen(true)} title="Settings">
            ⚙
          </button>
          <button className="btn-primary" onClick={() => openAddForm()}>
            + Add Workspace
          </button>
        </div>
      </header>

      <main className="app-main">
        {settings.workspaces.length === 0 ? (
          <div className="empty-state">
            <p>No workspaces yet.</p>
            <button className="btn-primary" onClick={() => openAddForm()}>
              Add your first workspace
            </button>
          </div>
        ) : (
          <WorkspaceGrid
            workspaces={[...settings.workspaces].sort((a, b) => a.name.localeCompare(b.name))}
            excludedPaths={settings.excludedPaths ?? []}
            onLaunch={(ws, parent) => window.api.workspace.launch(ws, parent ?? null)}
            onAddChild={(parentId) => openAddForm(parentId)}
            onEdit={(ws, parentId) => openEditForm(ws, parentId)}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onSelect={handleSelect}
          />
        )}
      </main>

      {formState && (
        <WorkspaceForm
          mode={formState.mode}
          isChild={!!formState.parentId}
          initial={formState.workspace}
          onSave={handleFormSave}
          onCancel={closeForm}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          message={`Are you sure you want to remove launcher for "${confirmState.name}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          onSave={handleSettingsSave}
          onCancel={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
