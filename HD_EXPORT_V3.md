# UAMapper HD Export v3

The Fragment API path returned HTTP 400 in the previous build. This version does not depend on the Fragment endpoint.

It requests the documented Visicom tile endpoint as SVG at up to +2 zoom levels, mosaics the native 256px vector tiles into an offscreen SVG background, and then captures the final composition. Visicom documents tile formats including SVG and zoom 0–19, with 256x256 tiles.

The exporter now aborts instead of silently falling back to the low-resolution Leaflet screenshot, so a successful export is known to contain the HD SVG tile mosaic.

Run `npm install` and `npm run build`. On export, the status should say `HD Visicom: zoom +2, ... SVG-тайлів.`
