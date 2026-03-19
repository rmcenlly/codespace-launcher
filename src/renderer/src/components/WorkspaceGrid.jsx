import WorkspaceCard from './WorkspaceCard'
import '../styles/WorkspaceGrid.css'

export default function WorkspaceGrid({ workspaces, excludedPaths, onLaunch, onAddChild, onEdit, onDelete }) {
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
        />
      ))}
    </div>
  )
}
