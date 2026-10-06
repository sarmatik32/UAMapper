# UAMapper HD Export v8

Visicom export now uses same-origin server-proxied native PNG fragments. The viewport is split into fragments no larger than 2048x2048 and stitched into one high-resolution canvas before html-to-image capture. This avoids browser CORS issues and the slow 256px tile-per-request approach.
