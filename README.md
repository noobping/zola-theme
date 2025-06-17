[![License: MIT](https://img.shields.io/badge/License-MIT-default.svg)](https://opensource.org/licenses/MIT)

# Zola theme
A minimalistic theme for [Zola](https://www.getzola.org/) static site generator. It uses the file names as titles and the folder for the menu structure. The theme is designed to be simple and easy to use, with a focus on content.

## Getting started
To use this theme, clone the repository and copy the `theme` folder to your Zola project. Then, update your `config.toml` file to use the new theme:

```sh
git submodule add https://github.com/noobping/zola-theme.git themes/noobping
```

```toml
theme = "noobping"

[extra]
keywords = "key, words, for, your, site"
share = true
webapp = true
theme_color = "#1976D2"
```

### Share button

You can enable a share button for your posts by adding the following line to your `config.toml` file:

```toml
share = true
```

### Offline support

Set the `webapp` option to `true` in your `config.toml` file to enable offline support for your site. This will generate a service worker that caches your site for offline use.

```toml
webapp = true
```
