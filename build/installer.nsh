; Chess To Me — custom NSIS installer hooks

; Enhanced uninstall detection and removal:
; Detects existing installations from BOTH:
; - HKLM (system-wide, all users)
; - HKCU (current user only)
; And uninstalls them before installing the new version.
!macro customInit
  ; Check for system-wide installation (HKLM - all users)
  ReadRegStr $R0 HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "QuietUninstallString"

  ; Check for per-user installation (HKCU - current user)
  ReadRegStr $R1 HKCU \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" \
    "QuietUninstallString"

  ; Uninstall system-wide version if found
  ${If} $R0 != ""
    DetailPrint "Removing previous system-wide installation..."
    ExecWait '$R0 _?=$INSTDIR'
    Sleep 1000
    ClearErrors
  ${EndIf}

  ; Uninstall per-user version if found (and different from system version)
  ${If} $R1 != ""
    ${If} $R1 != $R0
      DetailPrint "Removing previous per-user installation..."
      ExecWait '$R1 _?=$INSTDIR'
      Sleep 1000
      ClearErrors
    ${EndIf}
  ${EndIf}

  ; Ensure clean install directory
  ${If} ${FileExists} "$INSTDIR"
    DetailPrint "Cleaning up installation directory..."
    RMDir /r "$INSTDIR"
    Sleep 500
  ${EndIf}
!macroend
