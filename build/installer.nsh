; Chess To Me — custom NSIS installer hooks

; Silently uninstall any previous version before installing.
; Reads the QuietUninstallString from the registry entry electron-builder
; registers under the app's GUID, then waits for it to finish.
!macro customInit
  ReadRegStr $R0 HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "QuietUninstallString"
  ${If} $R0 != ""
    ExecWait '$R0 _?=$INSTDIR'
    Sleep 1000
    ClearErrors
  ${EndIf}
!macroend
