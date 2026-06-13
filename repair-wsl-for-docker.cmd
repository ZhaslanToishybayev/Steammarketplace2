@echo off
net session >nul 2>nul
if not "%errorlevel%"=="0" (
  echo This script must be run as Administrator.
  echo Right-click this file and choose "Run as administrator".
  pause
  exit /b 1
)

echo === Current WSL resolution ===
where wsl
echo.

echo === Enabling Windows features required by Docker Desktop ===
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism.exe /online /enable-feature /featurename:HypervisorPlatform /all /norestart

echo.
echo === Checking system WSL binary ===
if exist C:\Windows\System32\wsl.exe (
  dir C:\Windows\System32\wsl.exe
) else (
  echo C:\Windows\System32\wsl.exe is still missing.
  echo Running Windows system file repair. This can take several minutes.
  sfc /scannow
)

echo.
echo === Updating WSL where available ===
wsl --update
wsl --set-default-version 2
wsl --shutdown

echo.
echo Done. Restart Windows now, then open Docker Desktop again.
pause
