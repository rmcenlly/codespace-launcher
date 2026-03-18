export default function UpdateBanner({ updateState, onDownload, onInstall, onDismiss }) {
  if (updateState.phase === 'available') {
    return (
      <div className="update-banner">
        <span className="update-version">v{updateState.version} available</span>
        <button className="btn-update" onClick={onDownload}>Download</button>
      </div>
    )
  }

  if (updateState.phase === 'downloading') {
    return (
      <div className="update-banner">
        <span className="update-muted">Downloading… {updateState.percent}%</span>
      </div>
    )
  }

  if (updateState.phase === 'ready') {
    return (
      <div className="update-banner">
        <span className="update-version">Ready to install</span>
        <button className="btn-update" onClick={onInstall}>Restart</button>
      </div>
    )
  }

  if (updateState.phase === 'error') {
    return (
      <div className="update-banner">
        <span className="update-muted">Update check failed</span>
        <button className="btn-update-dismiss" onClick={onDismiss}>✕</button>
      </div>
    )
  }

  return null
}
