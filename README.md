<p align="center">
  <a href="https://revalex-technologies.github.io/Revalex-Technologies-Home/"><img src="static/icons/icon.png" width="256"></a>
</p>

<div align="center">
  <h1>Syra Browser</h1>

[![Build Status](https://github.com/Revalex-Technologies/Syra-Browser/actions/workflows/build.yml/badge.svg)](https://github.com/Revalex-Technologies/Syra-Browser/actions)
[![Downloads](https://img.shields.io/github/downloads/Revalex-Technologies/Syra-Browser/total.svg?style=flat-square)](https://revalex-technologies.github.io/Revalex-Technologies-Home/#/projects/Syra)
[![Discord](https://discordapp.com/api/guilds/1402495455077732422/widget.png?style=shield)](https://discord.gg/x6BKcWM4pf)

Syra is a web browser built on top of modern web technologies such as `Electron` and `React`, that can also be used as a framework to create a custom web browser (see the [License](#license) section).

</div>

# Table of Contents:
- [Motivation](#motivation)
- [Features](#features)
- [Screenshot](#screenshot)
- [Downloads](#downloads)
- [Contributing](#contributing)
- [Development](#development)
  - [Running](#running)
- [Documentation](#documentation)
- [License](#license)

## Motivation

As developers, many of us have attempted to compile Chromium from source, only to find the process extremely time-consuming and resource-intensive. **Syra** aims to address that challenge by leveraging the foundation provided by Wexond’s project, now updated to support modern Node.js and Electron versions.

> NOTICE: this project was pulled from a legally licensed commit

# Features

- **Syra Shield** - Browse the web without any ads and don't allow websites to track you. Thanks to the Syra Shield powered by [ghostery](https://github.com/ghostery/adblocker), websites can load even 8 times faster!
- **Chromium without Google services and low resources usage** - Since Syra uses Electron and wexond under the hood which is based on only several and the most important Chromium components, it's not bloated with redundant Google tracking services and others.
- **Fast and fluent UI** - The animations are really smooth and their timings are perfectly balanced.
- **Highly customizable new tab page** - Customize almost an every aspect of the new tab page!
- **Customizable browser UI** - Choose whether Syra should have compact or normal UI.
- **Tab groups** - Easily group tabs, so it's hard to get lost.
- **Scrollable tabs**
- **chrome extensions support** - install your favorite extensions from any chromium browser into Syra Browser instructions on setting this up can be found in [`docs/extensions`](docs/extensions.md)


## Other basic features

- Downloads popup with currently downloaded items and a download manager
- History manager
- Bookmarks bar & manager
- Settings
- Find in page
- Dark and light theme
- Omnibox with autocomplete algorithm similar to Chromium
- State of the art tab system along with tab tearing.

# Preview

![Preview](preview.png)

# Downloads
- [Stable](https://github.com/Revalex-Technologies/Syra-Browser/releases)

# Development

## Running

Make sure you have the latest version of node.js which you can find [`here`](https://nodejs.org/en/)
and if you are on windows go [`here`](https://github.com/nvm-sh/nvm/releases).

to switch between node versions on windows you will need nvm-windows (node version mamager for windows) which you can find [`here`](https://github.com/coreybutler/nvm-windows/releases).


### Type These commands for installing deps, building, running, or compiling.

Make sure you have corepack enabled. You can do so by running these commands

```bash
$ sudo corepack enable # enables corepack for node.js + linux
```

for windows run the command below as **administrator**:

```bash
$ corepack enable # enables corepack for node.js
```

```bash
$ yarn install # Install needed depedencies.
$ yarn run build # build native modules using Electron headers.
$ yarn run rebuild # Rebuild native modules using Electron headers.
$ yarn run dev # Run Syra in development mode
$ yarn run start # Run Syra in production mode
```

### More commands

```bash
$ yarn run compile-win32 # Package Syra for Windows
$ yarn run compile-linux # Package Syra for Linux
$ yarn run compile-darwin # Package Syra for macOS
$ yarn run lint # Runs linter
$ yarn run lint-fix # Runs linter and automatically applies fixes
```

More commands can be found in [`package.json`](package.json).

# Documentation

Guides and the API reference are located in [`docs`](docs) directory.

# Contributing

if you wish to contribute in any way, shape or form please give the [`Contributing License Agreement`](CONTRIBUTING.md) a Read


# License

This project is licensed under [GPL-3](LICENSE)
