# Freebox OS for Firefox: fosfox

## Features
Fosfox is a Firefox extension to connect Freebox download manager to Firefox.
It allows to download visited links from Firefox directly on your Freebox Revolution server.
You can add files or torrents to the download manager and choose where to store it.

## Screenshots
Download dialog:

![Download dialog](http://hardcoding.free.fr/blog/fosfox/download_dialog.png)

Location chooser:

![Location chooser](http://hardcoding.free.fr/blog/fosfox/location_chooser.png)

## How to build
Fosfox is still in developpemnt so no stable build must be proposed to [AMO](https://addons.mozilla.org) for the now.
It is a Jetpack addon so you need to [install Jetpack SDK](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation) to build the addon. Then you could make a build in activating the SDK and packing the addon with:
```Shell
bin/activate
cfx xpi
```


## Known issues
At a periodic rate (average a week ?), Freebox OS decline any authenticated call. Please log once into [Freebox OS](http://mafreebox.freebox.fr/) to work around the issue.
