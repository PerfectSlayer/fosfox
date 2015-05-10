# Freebox OS for Firefox: fosfox

## Features
Fosfox is a Firefox extension to connect Freebox download manager to Firefox.
It allows to download visited links from Firefox directly on your Freebox Revolution server.
You can add files or torrents to the download manager and choose where to store it.
While downloading, it displays the ETA of your downloads.

## Screenshots
Download dialog:

![Download dialog](http://hardcoding.free.fr/blog/fosfox/download_dialog.png)

Location chooser:

![Location chooser](http://hardcoding.free.fr/blog/fosfox/location_chooser.png)

## How to build
Fosfox is still in developpemnt so no stable build must be proposed to [AMO](https://addons.mozilla.org) for the now.
It is a Jetpack addon so you need to [install Jetpack SDK](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation) to build the addon. Then you could make a build in activating the SDK and packing the addon with:
```Shell
cd jetpack-directory
bin/activate
cd fosfox-directory
cfx xpi
```

## Development build
For early testers, you may have a look to [the development build on realease page](https://github.com/PerfectSlayer/fosfox/releases) to give a try to this extension. Don't hesitate to post issue for bug, improvement or feature request.
