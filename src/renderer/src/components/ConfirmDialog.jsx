export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="form-overlay">
      <div className="form-dialog" style={{ width: 360, gap: 16 }}>
        <p style={{ fontSize: 14, lineHeight: 1.5 }}>{message}</p>
        <div className="form-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-remove" onClick={onConfirm}>Remove</button>
        </div>
      </div>
    </div>
  )
}
