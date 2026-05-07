<!-- doc_id: doc_other_0080 -->
# Windows / WSL CLI Routing Rules

## Scope
These rules apply to the current 3KLife workspace when it is opened in either:
- a normal local Windows Insiders window
- a WSL Remote Insiders window

The routing decision must follow the active window, not the machine-wide presence of WSL.

## Local Windows Window
Use this route when the workspace path is a Windows path such as `C:\Users\...` or `file:///c:/...`.

Rules:
- Use Windows PowerShell 5.1 with `-NoLogo -NoProfile`.
- Use absolute Windows paths.
- Prefer `git -C <repo>`, `node <absolute script path>`, and native PowerShell cmdlets.
- Do not use bash-style paths such as `/c/...`.
- Do not use `&&`; use PowerShell separators or one command per line.
- Do not assume `bash.exe` or `wsl.exe` means the current shell is Linux.

## WSL Remote Window
Use this route when the workspace is attached through WSL Remote and the paths are Linux-style such as `/home/...` or `/mnt/c/...`.

Rules:
- Use POSIX shell syntax.
- Use Linux paths.
- Use `bash` or `sh` semantics.
- Do not use `C:\...` paths inside shell commands.
- Do not use PowerShell cmdlets unless you are explicitly crossing back into Windows.

## Minimal Routing Rules
- Route by active window type, not by installed software.
- If the window is local Windows, keep the command line Windows-native.
- If the window is WSL Remote, keep the command line POSIX-native.
- When in doubt, probe once, then stop and switch to the matching dialect.
- Prefer a single compound command over many tiny tool calls when the shell dialect is already known.
- Prefer direct CLI execution over an extra Python wrapper unless Python is needed to fix encoding or quoting.
