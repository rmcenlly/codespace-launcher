import { useState } from 'react'
import '../styles/SettingsDialog.css'

export default function SettingsDialog({ settings, onSave, onCancel }) {
  const [excludedPaths, setExcludedPaths] = useState(settings.excludedPaths ?? [])
  const [newPath, setNewPath] = useState('')
  const [excludedOpen, setExcludedOpen] = useState(true)
  const [defaultDirectory, setDefaultDirectory] = useState(settings.defaultDirectory ?? '')
  const [closeLauncherOnOpen, setCloseLauncherOnOpen] = useState(settings.closeLauncherOnOpen ?? false)

  async function browsePath() {
    const result = await window.api.dialog.openPath({ folder: true })
    if (result) setNewPath(result)
  }

  async function browseDefaultDir() {
    const result = await window.api.dialog.openPath({ folder: true })
    if (result) setDefaultDirectory(result)
  }

  function addPath() {
    const trimmed = newPath.trim()
    if (trimmed && !excludedPaths.includes(trimmed)) {
      setExcludedPaths([...excludedPaths, trimmed])
      setNewPath('')
    }
  }

  function removePath(path) {
    setExcludedPaths(excludedPaths.filter((p) => p !== path))
  }

  function handleSave() {
    onSave({
      ...settings,
      excludedPaths,
      defaultDirectory: defaultDirectory.trim() || null,
      closeLauncherOnOpen
    })
  }

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="settings-dialog">
        <h2>Settings</h2>

        <section className="settings-section">
          <h3 className="settings-section-title">General</h3>

          <div className="settings-field">
            <span className="settings-field-label">Default Directory</span>
            <p className="settings-section-hint">Browse dialogs open here by default when no previous directory has been visited.</p>
            <div className="settings-field-row">
              <input
                type="text"
                value={defaultDirectory}
                onChange={(e) => setDefaultDirectory(e.target.value)}
                placeholder="Not configured"
              />
              <button className="btn-browse" onClick={browseDefaultDir}>Browse</button>
              {defaultDirectory && (
                <button className="btn-icon btn-danger" onClick={() => setDefaultDirectory('')} title="Clear">✕</button>
              )}
            </div>
          </div>

          <label className="settings-toggle-row">
            <div className="settings-toggle-info">
              <span className="settings-toggle-title">Close Launcher on Codespace Open</span>
              <span className="settings-toggle-hint">Hide the launcher window when opening a workspace</span>
            </div>
            <span className="toggle">
              <input
                type="checkbox"
                checked={closeLauncherOnOpen}
                onChange={(e) => setCloseLauncherOnOpen(e.target.checked)}
              />
              <span className="toggle-track" />
            </span>
          </label>
        </section>

        <section className="settings-section">
          <button
            className="settings-section-header"
            onClick={() => setExcludedOpen((v) => !v)}
          >
            <span>Excluded Paths</span>
            <span className={`settings-section-chevron ${excludedOpen ? 'open' : ''}`}>▾</span>
          </button>

          <p className="settings-section-hint">
            Paths listed here are stripped from the beginning of workspace paths in the display.
          </p>

          <div className={`settings-section-body ${excludedOpen ? 'open' : ''}`}>
            <div className="settings-section-content">
              <div className="excluded-list">
                {excludedPaths.length === 0 ? (
                  <p className="excluded-empty">No excluded paths.</p>
                ) : (
                  excludedPaths.map((p) => (
                    <div key={p} className="excluded-item">
                      <span className="excluded-path">{p}</span>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => removePath(p)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="excluded-add-row">
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPath()}
                  placeholder="Path to exclude…"
                />
                <button className="btn-browse" onClick={browsePath}>
                  Browse
                </button>
                <button className="btn-primary" onClick={addPath} disabled={!newPath.trim()}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="settings-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
