```
 _ _     _       __       ___ __          _ _ _ 
( | )__ (_)__  _/_/__ ___/ (_) /____  ___| ( | )
|/|(_-</ / _ \/ // -_) _  / / __/ _ \/ __/ //|/ 
  /___/_/_//_/ / \__/\_,_/_/\__/\___/_/_/_/     
             |_|                      /_/       
```

A code editor as a function of you. Period: 2π. Amplitude: yes.

## Overview

**sin(editor)** is a desktop code editor built with Electron, Monaco Editor, and xterm.js. It features a minimalist design with syntax highlighting, file exploration, theming, terminal integration, and various productivity tools.

## Features

- **Monaco Editor** - Full-featured code editor with syntax highlighting, autocomplete, and coding assistance
- **File Explorer** - Browse and manage files within a project folder
- **Terminal** - Integrated terminal with xterm.js and node-pty support
- **Theme System** - Multiple built-in themes (Everforest, Dracula, Nord, Gruvbox, Catppuccin, etc.) with customizable colors
- **Language Support** - Built-in support for many languages plus custom parsers for Haskell, Crystal, Zig, TOML, Nix
- **Split View** - Split editor pane for comparing/editing multiple files
- **Project Search** - Search across files in your project
- **File Management** - Create, rename, and delete files and folders
- **Settings** - Customizable font, theme, keybindings, and behavior saved to localStorage
- **Markdown Preview** - Preview markdown files with syntax highlighting
- **Chime/Sound** - Auditory feedback for tab changes and operations
- **Recent Files** - Quick access to recently opened files

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Installation

```bash
npm install sin-editor
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+Shift+O` | Open folder |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+W` | Close tab |
| `Ctrl+P` | Go to file |
| `Ctrl+Shift+F` | Search project |
| `Ctrl+\` | Split pane |
| `Ctrl+\`` | Toggle terminal |
| `Ctrl+,` | Open settings |
| `Ctrl+Shift+M` | Markdown preview |

## Project Structure

- `index.html` - Main UI definition
- `main.js` - Electron main process (IPC, file operations, terminal management)
- `preload.js` - Bridge between renderer and main process (exposed `sin` object)
- `main.js` - Monaco editor initialization and theming
- `zed-icons.js` - Custom icon definitions and extension maps

## Development

The application uses these npm packages:
- `monaco-editor` - Code editor component
- `@xterm/xterm` - Terminal emulator
- `@xterm/addon-fit` - Terminal resize addon
- `@lydell/node-pty` - PTY support for terminal
- `marked` - Markdown rendering

## License

This project is open source. See the repository for license details.
