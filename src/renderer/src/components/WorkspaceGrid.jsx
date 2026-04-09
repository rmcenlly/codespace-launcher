import WorkspaceCard from './WorkspaceCard'
import '../styles/WorkspaceGrid.css'

export default function WorkspaceGrid({ workspaces, excludedPaths, onLaunch, onAddChild, onEdit, onDelete, selectedIds, onSelect }) {
  return (
    <div className="workspace-grid">
      {workspaces.map((ws) => (
        <WorkspaceCard
          key={ws.id}
          workspace={ws}
          rootWorkspace={ws}
          excludedPaths={excludedPaths}
          onLaunch={onLaunch}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
          selected={selectedIds?.has(ws.id) ?? false}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
