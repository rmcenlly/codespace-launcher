; Registers the app to run at Windows startup for the current user.
; Users can disable this via Task Manager > Startup Apps at any time.
!macro customInstall
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" \
    "Codespace Launcher" "$INSTDIR\Codespace Launcher.exe"
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" \
    "Codespace Launcher"
!macroend
