# Codespace Launcher

A Windows desktop app for launching VS Code workspaces and folders with custom taskbar icons. Assign unique icons to each project, organise sub-projects as child workspaces, and launch everything with a single click — each workspace gets its own distinct entry in the taskbar.

## Requirements

- Windows 10 or later
- [.NET 9 Runtime](https://dotnet.microsoft.com/en-us/download/dotnet/9.0) (required for custom taskbar icons)

## Installation

1. Install the [.NET 9 Runtime](https://dotnet.microsoft.com/en-us/download/dotnet/9.0) if you don't have it already
2. Go to the [Releases](https://github.com/rmcenlly/codespace-launcher/releases/latest) page
3. Download `Codespace Launcher Setup x.x.x.exe`
4. Run the installer (Windows may show a SmartScreen warning — click **More info → Run anyway**)

## Adding a Workspace

1. Click **+ Add Workspace** in the top-right corner
2. Click **Folder** to pick a folder, or **.code-workspace** to pick a `.code-workspace` file
3. Give it a name and optionally set an icon (see below)
4. Click **Add**

## Custom Icons

Codespace Launcher will automatically pick up an icon for a workspace if you place an image file in an `icons/` subfolder next to it, named to match the workspace.

**Example — folder workspace:**
```
C:\Projects\MyApp\
C:\Projects\MyApp\icons\MyApp.png   ← auto-detected
```

**Example — .code-workspace file:**
```
C:\Projects\MyApp.code-workspace
C:\Projects\icons\MyApp.png         ← auto-detected
```

Supported formats: `.png`, `.jpg`, `.svg`, `.ico`, `.webp`

You can also set an icon path explicitly when adding or editing a workspace via the **Browse** button.

## Child Workspaces

Child workspaces let you group sub-projects under a parent. When launched, a child opens in VS Code under the parent's taskbar icon, keeping your taskbar tidy.

To add a child workspace, click **+ Add child workspace** at the bottom of any workspace card.

Children can have their own children — the hierarchy is unlimited.

## Launching

Click the **▶** button on any workspace card to open it in VS Code. Each top-level workspace gets its own taskbar icon; child workspaces share the parent's icon.

You can launch multiple workspaces simultaneously — each opens independently.

## Updates

The app checks for updates automatically a few seconds after launch. When an update is available, a banner appears in the top bar. Click **Download**, wait for it to complete, then click **Restart** to apply the update.

## Building from Source

Requirements: Node.js, .NET 9 SDK

```bash
npm install
npm run build:stub   # builds the .NET stub (requires .NET 9 SDK)
npm run dev          # start in development mode
npm run package:win  # build the Windows installer (no publish)
```

To publish a release, set your `GH_TOKEN` in a `.env` file and run:
```bash
npm run package:release
```
