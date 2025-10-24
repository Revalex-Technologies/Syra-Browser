# Extensions

While Syra Does support MV3 and MV2 Extensions, electron does not currently have every single chrome api so some of your extensions may not work properly or error out saying theres some features missing and to update your browser.

# Installing an extension

To install an extension, you can use the chrome web store, and if you dont want to do that, you will need to extract the `crx` file of the extension and put the extracted folder to `extensions` directory.

The `extensions` directory paths:
- On Linux and macOS: `~/.syra/extensions`
- On Windows: `%USERPROFILE%/.syra/extensions`
