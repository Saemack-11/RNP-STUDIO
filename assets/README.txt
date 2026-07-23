RNP APP ICON INSTALLATION

Upload these files to your GitHub repository:

RNP-STUDIO/
├── manifest.webmanifest
└── assets/
    ├── rnp-app-icon.png
    ├── icon-512.png
    ├── icon-192.png
    ├── apple-touch-icon.png
    ├── favicon-64.png
    └── favicon-32.png

Then paste the contents of index-head-patch.html inside the <head> section
of index.html. Replace any older manifest, favicon, or apple-touch-icon tags
to avoid duplicate declarations.

After Vercel deploys, remove the old Home Screen shortcut from the iPhone and
add RNP Studio to the Home Screen again so iOS refreshes the cached icon.
