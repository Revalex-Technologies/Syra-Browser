!macro customInstall
  WriteRegStr SHCTX "SOFTWARE\RegisteredApplications" "syra" "Software\Clients\StartMenuInternet\syra\Capabilities"

  WriteRegStr SHCTX "SOFTWARE\Classes\syra" "" "syra HTML Document"
  WriteRegStr SHCTX "SOFTWARE\Classes\syra\Application" "AppUserModelId" "syra"
  WriteRegStr SHCTX "SOFTWARE\Classes\syra\Application" "ApplicationIcon" "$INSTDIR\syra.exe,0"
  WriteRegStr SHCTX "SOFTWARE\Classes\syra\Application" "ApplicationName" "syra"
  WriteRegStr SHCTX "SOFTWARE\Classes\syra\Application" "ApplicationCompany" "syra"      
  WriteRegStr SHCTX "SOFTWARE\Classes\syra\Application" "ApplicationDescription" "A privacy-focused, extensible and beautiful web browser"      
  WriteRegStr SHCTX "SOFTWARE\Classes\syra\DefaultIcon" "DefaultIcon" "$INSTDIR\syra.exe,0"
  WriteRegStr SHCTX "SOFTWARE\Classes\syra\shell\open\command" "" '"$INSTDIR\syra.exe" "%1"'

  WriteRegStr SHCTX "SOFTWARE\Classes\.htm\OpenWithProgIds" "syra" ""
  WriteRegStr SHCTX "SOFTWARE\Classes\.html\OpenWithProgIds" "syra" ""

  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra" "" "syra"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\DefaultIcon" "" "$INSTDIR\syra.exe,0"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\Capabilities" "ApplicationDescription" "A privacy-focused, extensible and beautiful web browser"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\Capabilities" "ApplicationName" "syra"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\Capabilities" "ApplicationIcon" "$INSTDIR\syra.exe,0"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\Capabilities\FileAssociations" ".htm" "syra"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\Capabilities\FileAssociations" ".html" "syra"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\Capabilities\URLAssociations" "http" "syra"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\Capabilities\URLAssociations" "https" "syra"
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\Capabilities\StartMenu" "StartMenuInternet" "syra"
  
  WriteRegDWORD SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\InstallInfo" "IconsVisible" 1
  
  WriteRegStr SHCTX "SOFTWARE\Clients\StartMenuInternet\syra\shell\open\command" "" "$INSTDIR\syra.exe"
!macroend
!macro customUnInstall
  DeleteRegKey SHCTX "SOFTWARE\Classes\syra"
  DeleteRegKey SHCTX "SOFTWARE\Clients\StartMenuInternet\syra"
  DeleteRegValue SHCTX "SOFTWARE\RegisteredApplications" "syra"
!macroend