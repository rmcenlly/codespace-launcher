import { useState } from 'react'
import '../styles/SettingsDialog.css'

export default function SettingsDialog({ settings, onSave, onCancel }) {
  const [excludedPaths, setExcludedPaths] = useState(settings.excludedPaths ?? [])
  const [newPath, setNewPath] = useState('')
  const [excludedOpen, setExcludedOpen] = useState(true)

  async function browsePath() {
    const result = await window.api.dialog.openPath({ folder: true })
    if (result) setNewPath(result)
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
    onSave({ ...settings, excludedPaths })
  }

  return (
    <div className="form-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="settings-dialog">
        <h2>Settings</h2>

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
