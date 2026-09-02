# UAMapper HD Export v6

## What changed
- Removed the per-tile DOM export background used by v5.
- HD Visicom tiles are now fetched at up to `interactive zoom + 2`.
- Tiles are composed off-DOM into a single high-resolution canvas mosaic.
- The mosaic is converted to one PNG data URL and inserted as one `<img>` for `html-to-image`.
- The live Leaflet tile pane is hidden only after the HD mosaic is fully ready.
- If an HD tile fails, the live map remains visible and export fails cleanly instead of producing a blank/grey map.
- Export target was reduced to a practical minimum of 4096 px wide with a lower capture ratio to reduce export time.

## Expected console message
`[UAMapper HD Export] Visicom mosaic ready`

It reports `interactiveZoom`, `sourceZoom`, `zoomBoost`, source pixels and tile count.
