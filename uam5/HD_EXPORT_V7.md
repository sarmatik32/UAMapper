# HD Export V7

Fixes the blank-background export caused by using `origin=nw` with the live Visicom TMS configuration.

- Uses the same Visicom URL scheme as the live Leaflet layer.
- Converts projected XYZ Y to TMS Y (`tmsY = n - 1 - xyzY`).
- Removes the incorrect `origin=nw` query parameter.
- Uses one native zoom level above the interactive map by default. This avoids hundreds of network requests on 1440p/1080p exports while still sourcing 4x as many map pixels per viewport area.
- Loads tiles in batches of 8 to reduce browser connection/memory pressure.
- Builds one off-DOM PNG mosaic, then inserts one image for `html-to-image`.
- Never hides the live Leaflet tile pane until the HD mosaic is fully ready.
