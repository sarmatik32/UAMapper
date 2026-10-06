const fs = require('fs');
const path = require('path');

function patchFile(filePath, regexReplacements) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { regex, replace } of regexReplacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replace);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully patched: ${filePath}`);
    return true;
  }
  return false;
}

const leafletDir = path.resolve(__dirname, '../node_modules/leaflet');

// Regex patterns to handle CRLF or LF transparently
const setPositionRegex = /(export\s+)?function\s+setPosition\s*\(\s*el\s*,\s*point\s*\)\s*\{[\r\n\s\t\/\*a-zA-Z-]*?el\._leaflet_pos\s*=\s*point;[\r\n\s\t\/\*a-zA-Z-]*?if\s*\(\s*Browser\.any3d\s*\)\s*\{[\r\n\s\t]*setTransform\s*\(\s*el\s*,\s*point\s*\);[\r\n\s\t]*\}\s*else\s*\{[\r\n\s\t]*el\.style\.left\s*=\s*point\.x\s*\+\s*['"]px['"];[\r\n\s\t]*el\.style\.top\s*=\s*point\.y\s*\+\s*['"]px['"];[\r\n\s\t]*\}[\r\n\s\t]*\}/;

const getPositionRegex = /(export\s+)?function\s+getPosition\s*\(\s*el\s*\)\s*\{[\r\n\s\t\/\*a-zA-Z-]*?return\s+el\._leaflet_pos\s*\|\|\s*new\s+Point\s*\(\s*0\s*,\s*0\s*\);[\r\n\s\t]*\}/;

const setTransformRegex = /(export\s+)?function\s+setTransform\s*\(\s*el\s*,\s*offset\s*,\s*scale\s*\)\s*\{[\r\n\s\t]*var\s+pos\s*=\s*offset\s*\|\|\s*new\s+Point/;

const latLngSrcRegex = /if\s*\(\s*isNaN\(\s*lat\s*\)\s*\|\|\s*isNaN\(\s*lng\s*\)\s*\)\s*\{\s*throw\s+new\s+Error\(\s*['"]Invalid LatLng object: \(['"]\s*\+\s*lat\s*\+\s*['"], ['"]\s*\+\s*lng\s*\+\s*['"]\)['"]\s*\);\s*\}/g;

const generalReplacements = [
  {
    regex: setPositionRegex,
    replace: `$1function setPosition(el, point) {
\tif (!el || typeof el !== 'object') return;
\tif (!point || isNaN(point.x) || isNaN(point.y)) {
\t\tpoint = (el._leaflet_pos && !isNaN(el._leaflet_pos.x) && !isNaN(el._leaflet_pos.y)) ? el._leaflet_pos : new Point(0, 0);
\t}
\tel._leaflet_pos = point;
\tif (Browser.any3d) {
\t\tsetTransform(el, point);
\t} else if (el.style) {
\t\tel.style.left = point.x + 'px';
\t\tel.style.top = point.y + 'px';
\t}
}`
  },
  {
    regex: getPositionRegex,
    replace: `$1function getPosition(el) {
\tif (!el || typeof el !== 'object') return new Point(0, 0);
\tvar pos = el._leaflet_pos;
\tif (pos && typeof pos === 'object' && !isNaN(pos.x) && !isNaN(pos.y)) return pos;
\treturn new Point(0, 0);
}`
  },
  {
    regex: setTransformRegex,
    replace: `$1function setTransform(el, offset, scale) {
\tif (!el || !el.style) return;
\tvar pos = offset || new Point`
  },
  {
    regex: latLngSrcRegex,
    replace: `if (isNaN(lat) || isNaN(lng)) { lat = isNaN(lat) ? 0 : +lat; lng = isNaN(lng) ? 0 : +lng; }`
  }
];

patchFile(path.join(leafletDir, 'dist/leaflet-src.js'), generalReplacements);
patchFile(path.join(leafletDir, 'dist/leaflet-src.esm.js'), generalReplacements);
patchFile(path.join(leafletDir, 'src/geo/LatLng.js'), generalReplacements);
patchFile(path.join(leafletDir, 'src/dom/DomUtil.js'), generalReplacements);

// Minified dist/leaflet.js
const minReplacements = [
  {
    regex: /function\s+Z\s*\(\s*t\s*,\s*e\s*\)\s*\{\s*t\._leaflet_pos\s*=\s*e\s*,\s*b\.any3d\s*\?\s*be\s*\(\s*t\s*,\s*e\s*\)\s*:\s*\(\s*t\.style\.left\s*=\s*e\.x\s*\+\s*['"]px['"]\s*,\s*t\.style\.top\s*=\s*e\.y\s*\+\s*['"]px['"]\s*\)\s*\}/,
    replace: `function Z(t,e){if(!t||typeof t!="object")return;t._leaflet_pos=e,b.any3d?be(t,e):(t.style&&(t.style.left=(e?e.x:0)+"px",t.style.top=(e?e.y:0)+"px"))}`
  },
  {
    regex: /function\s+Pe\s*\(\s*t\s*\)\s*\{\s*return\s+t\._leaflet_pos\s*\|\|\s*new\s+p\s*\(\s*0\s*,\s*0\s*\)\s*\}/,
    replace: `function Pe(t){return(t&&t._leaflet_pos)||new p(0,0)}`
  },
  {
    regex: /if\s*\(\s*isNaN\(\s*t\s*\)\s*\|\|\s*isNaN\(\s*e\s*\)\s*\)\s*throw\s+new\s+Error\(\s*["']Invalid LatLng object: \(["']\s*\+\s*t\s*\+\s*["'], ["']\s*\+\s*e\s*\+\s*["']\)["']\s*\)\s*;/g,
    replace: `if(isNaN(t)||isNaN(e)){t=isNaN(t)?0:+t;e=isNaN(e)?0:+e;}`
  }
];

patchFile(path.join(leafletDir, 'dist/leaflet.js'), minReplacements);

// Clear Vite cache so dev server and builds pick up the patched Leaflet immediately
const viteCacheDir = path.resolve(__dirname, '../node_modules/.vite');
if (fs.existsSync(viteCacheDir)) {
  fs.rmSync(viteCacheDir, { recursive: true, force: true });
  console.log('Cleared node_modules/.vite cache');
}

console.log('Leaflet patching completed.');
