import L from 'leaflet';

// Global comprehensive safeguard for Leaflet to eliminate "_leaflet_pos" and animation errors on unmounted/intermediate elements
if (typeof window !== 'undefined' && L) {
  // 1. Safeguard L.DomUtil.getPosition and setPosition
  if (L.DomUtil) {
    L.DomUtil.getPosition = function (el: any): L.Point {
      if (!el || typeof el !== 'object') {
        return new L.Point(0, 0);
      }
      const pos = el._leaflet_pos;
      if (pos && typeof pos === 'object' && !isNaN(pos.x) && !isNaN(pos.y)) {
        return pos;
      }
      return new L.Point(0, 0);
    };

    L.DomUtil.setPosition = function (el: any, point: L.Point): void {
      if (!el || typeof el !== 'object') return;
      if (!point || isNaN(point.x) || isNaN(point.y)) {
        point = (el._leaflet_pos && !isNaN(el._leaflet_pos.x) && !isNaN(el._leaflet_pos.y))
          ? el._leaflet_pos
          : new L.Point(0, 0);
      }
      el._leaflet_pos = point;
      try {
        if (L.Browser && L.Browser.any3d) {
          L.DomUtil.setTransform(el, point);
        } else if (el.style) {
          el.style.left = point.x + 'px';
          el.style.top = point.y + 'px';
        }
      } catch {}
    };
  }

  // 2. Safeguard L.Map.prototype._getMapPanePos, _rawPanBy, and _resetView
  if (L.Map && L.Map.prototype) {
    const mapProto = L.Map.prototype as any;

    mapProto._getMapPanePos = function (): L.Point {
      if (!this._mapPane) return new L.Point(0, 0);
      try {
        const pos = (this._mapPane as any)._leaflet_pos || L.DomUtil.getPosition(this._mapPane);
        if (pos && typeof pos === 'object' && !isNaN(pos.x) && !isNaN(pos.y)) {
          return pos;
        }
        return new L.Point(0, 0);
      } catch {
        return new L.Point(0, 0);
      }
    };

    const origRawPanBy = mapProto._rawPanBy;
    if (origRawPanBy) {
      mapProto._rawPanBy = function (offset: L.Point) {
        if (!this._mapPane || !offset || isNaN(offset.x) || isNaN(offset.y)) return;
        try {
          origRawPanBy.call(this, offset);
        } catch {}
      };
    }

    const origResetView = mapProto._resetView;
    if (origResetView) {
      mapProto._resetView = function (center: L.LatLng, zoom: number, noMoveStart?: boolean) {
        if (!this._mapPane) return;
        try {
          origResetView.call(this, center, zoom, noMoveStart);
        } catch {}
      };
    }
  }

  // 3. Safeguard L.PosAnimation
  if (L.PosAnimation && L.PosAnimation.prototype) {
    const posAnimProto = L.PosAnimation.prototype as any;

    const origRun = posAnimProto.run;
    if (origRun) {
      posAnimProto.run = function (el: any, newPos: L.Point, duration?: number, easeLinearity?: number) {
        if (!el || typeof el !== 'object') return;
        if (!newPos || isNaN(newPos.x) || isNaN(newPos.y)) return;
        if (!el._leaflet_pos || isNaN(el._leaflet_pos.x) || isNaN(el._leaflet_pos.y)) {
          el._leaflet_pos = new L.Point(0, 0);
        }
        try {
          origRun.call(this, el, newPos, duration, easeLinearity);
        } catch (err) {
          // Suppress PosAnimation error on detached element
        }
      };
    }

    const origStep = posAnimProto._step;
    if (origStep) {
      posAnimProto._step = function (...args: any[]) {
        if (!this._el || typeof this._el !== 'object') return;
        try {
          origStep.apply(this, args);
        } catch {}
      };
    }

    const origRunFrame = posAnimProto._runFrame;
    if (origRunFrame) {
      posAnimProto._runFrame = function (...args: any[]) {
        if (!this._el || typeof this._el !== 'object') return;
        // Ensure progress argument is valid number to prevent NaN coordinates in multiplyBy
        if (args[0] === undefined || isNaN(args[0])) {
          args[0] = 1;
        }
        try {
          origRunFrame.apply(this, args);
        } catch {}
      };
    }
  }

  // 4. Safeguard L.Handler.MarkerDrag
  if ((L.Handler as any)?.MarkerDrag?.prototype) {
    const markerDragProto = (L.Handler as any).MarkerDrag.prototype;

    const origAdjustPan = markerDragProto._adjustPan;
    if (origAdjustPan) {
      markerDragProto._adjustPan = function (e: any) {
        if (!this._marker || !this._marker._icon || !this._marker._map) return;
        if (!(this._marker._icon as any)._leaflet_pos) {
          (this._marker._icon as any)._leaflet_pos = new L.Point(0, 0);
        }
        try {
          origAdjustPan.call(this, e);
        } catch (err) {}
      };
    }

    const origOnDrag = markerDragProto._onDrag;
    if (origOnDrag) {
      markerDragProto._onDrag = function (e: any) {
        if (!this._marker || !this._marker._icon || !this._marker._map) return;
        if (!(this._marker._icon as any)._leaflet_pos) {
          (this._marker._icon as any)._leaflet_pos = new L.Point(0, 0);
        }
        try {
          origOnDrag.call(this, e);
        } catch (err) {}
      };
    }

    const origOnPreDrag = markerDragProto._onPreDrag;
    if (origOnPreDrag) {
      markerDragProto._onPreDrag = function (e: any) {
        if (!this._marker || !this._marker._icon || !this._marker._map) return;
        try {
          origOnPreDrag.call(this, e);
        } catch (err) {}
      };
    }

    const origOnDragStart = markerDragProto._onDragStart;
    if (origOnDragStart) {
      markerDragProto._onDragStart = function () {
        if (!this._marker || !this._marker._icon || !this._marker._map) return;
        try {
          origOnDragStart.call(this);
        } catch (err) {}
      };
    }

    const origOnDragEnd = markerDragProto._onDragEnd;
    if (origOnDragEnd) {
      markerDragProto._onDragEnd = function (e: any) {
        if (!this._marker) return;
        try {
          origOnDragEnd.call(this, e);
        } catch (err) {}
      };
    }
  }

  // 5. Safeguard L.Draggable
  if (L.Draggable && L.Draggable.prototype) {
    const draggableProto = L.Draggable.prototype as any;

    const origOnDown = draggableProto._onDown;
    if (origOnDown) {
      draggableProto._onDown = function (e: any) {
        if (!this._element || typeof this._element !== 'object') return;
        if (!this._element._leaflet_pos) {
          this._element._leaflet_pos = new L.Point(0, 0);
        }
        try {
          origOnDown.call(this, e);
        } catch (err) {}
      };
    }

    const origOnMove = draggableProto._onMove;
    if (origOnMove) {
      draggableProto._onMove = function (e: any) {
        if (!this._element || typeof this._element !== 'object') return;
        if (!this._element._leaflet_pos) {
          this._element._leaflet_pos = new L.Point(0, 0);
        }
        try {
          origOnMove.call(this, e);
        } catch (err) {}
      };
    }

    const origOnUp = draggableProto._onUp;
    if (origOnUp) {
      draggableProto._onUp = function (e: any) {
        if (!this._element) return;
        try {
          origOnUp.call(this, e);
        } catch (err) {}
      };
    }

    const origUpdatePosition = draggableProto._updatePosition;
    if (origUpdatePosition) {
      draggableProto._updatePosition = function () {
        if (!this._element || typeof this._element !== 'object') return;
        if (!this._element._leaflet_pos) {
          this._element._leaflet_pos = new L.Point(0, 0);
        }
        try {
          origUpdatePosition.call(this);
        } catch {}
      };
    }
  }

  // 6. Safeguard L.Marker
  if (L.Marker && L.Marker.prototype) {
    const origUpdate = (L.Marker.prototype as any).update;
    if (origUpdate) {
      (L.Marker.prototype as any).update = function () {
        if (!this._icon || !this._map) return this;
        try {
          return origUpdate.call(this);
        } catch {
          return this;
        }
      };
    }

    const origSetPos = (L.Marker.prototype as any)._setPos;
    if (origSetPos) {
      (L.Marker.prototype as any)._setPos = function (pos: L.Point) {
        if (!this._icon) return;
        try {
          origSetPos.call(this, pos);
        } catch {}
      };
    }

    const origAnimateZoom = (L.Marker.prototype as any)._animateZoom;
    if (origAnimateZoom) {
      (L.Marker.prototype as any)._animateZoom = function (opt: any) {
        if (!this._map || !this._icon) return;
        try {
          origAnimateZoom.call(this, opt);
        } catch {}
      };
    }

    const origSetIcon = L.Marker.prototype.setIcon;
    if (origSetIcon) {
      L.Marker.prototype.setIcon = function (icon: L.Icon | L.DivIcon) {
        const isDraggingEnabled = this.dragging && this.dragging.enabled();
        if (isDraggingEnabled) {
          this.dragging.disable();
        }
        const res = origSetIcon.call(this, icon);
        if (isDraggingEnabled && this._map && this._icon) {
          this.dragging.enable();
        }
        return res;
      };
    }
  }

  // 7. Safeguard L.Popup & L.Tooltip
  if (L.Popup && L.Popup.prototype) {
    const popupProto = L.Popup.prototype as any;
    const origUpdatePosition = popupProto._updatePosition;
    if (origUpdatePosition) {
      popupProto._updatePosition = function () {
        if (!this._container || !this._map) return;
        try {
          origUpdatePosition.call(this);
        } catch {}
      };
    }

    const origAnimateZoom = popupProto._animateZoom;
    if (origAnimateZoom) {
      popupProto._animateZoom = function (opt: any) {
        if (!this._container || !this._map) return;
        try {
          origAnimateZoom.call(this, opt);
        } catch {}
      };
    }
  }

  if (L.Tooltip && L.Tooltip.prototype) {
    const tooltipProto = L.Tooltip.prototype as any;
    const origUpdatePosition = tooltipProto._updatePosition;
    if (origUpdatePosition) {
      tooltipProto._updatePosition = function () {
        if (!this._container || !this._map) return;
        try {
          origUpdatePosition.call(this);
        } catch {}
      };
    }

    const origSetPosition = tooltipProto._setPosition;
    if (origSetPosition) {
      tooltipProto._setPosition = function (pos: any) {
        if (!this._container || !this._map) return;
        try {
          origSetPosition.call(this, pos);
        } catch {}
      };
    }

    const origAnimateZoom = tooltipProto._animateZoom;
    if (origAnimateZoom) {
      tooltipProto._animateZoom = function (opt: any) {
        if (!this._container || !this._map) return;
        try {
          origAnimateZoom.call(this, opt);
        } catch {}
      };
    }
  }

  // 8. Safeguard L.latLng and L.marker coordinate inputs
  if (L.latLng) {
    const origLatLng = L.latLng;
    (L as any).latLng = function (a: any, b?: any, c?: any) {
      try {
        if (a instanceof L.LatLng) return a;
        if (Array.isArray(a)) {
          const lat = isNaN(Number(a[0])) ? 0 : Number(a[0]);
          const lng = isNaN(Number(a[1])) ? 0 : Number(a[1]);
          return origLatLng.call(L, [lat, lng, a[2]]);
        }
        if (a && typeof a === 'object' && ('lat' in a || 'lng' in a || 'lon' in a)) {
          const lat = isNaN(Number(a.lat)) ? 0 : Number(a.lat);
          const lng = isNaN(Number('lng' in a ? a.lng : a.lon)) ? 0 : Number('lng' in a ? a.lng : a.lon);
          return origLatLng.call(L, { lat, lng, alt: a.alt });
        }
        const lat = isNaN(Number(a)) ? 0 : Number(a);
        const lng = isNaN(Number(b)) ? 0 : Number(b);
        return origLatLng.call(L, lat, lng, c);
      } catch {
        return origLatLng.call(L, 0, 0);
      }
    };
  }

  if (L.Marker && L.Marker.prototype) {
    const origSetLatLng = L.Marker.prototype.setLatLng;
    if (origSetLatLng) {
      L.Marker.prototype.setLatLng = function (latlng: any) {
        if (!latlng) return this;
        try {
          if (Array.isArray(latlng)) {
            if (isNaN(Number(latlng[0])) || isNaN(Number(latlng[1]))) return this;
          } else if (typeof latlng === 'object') {
            if (isNaN(Number(latlng.lat)) || isNaN(Number(latlng.lng || latlng.lon))) return this;
          }
          return origSetLatLng.call(this, latlng);
        } catch {
          return this;
        }
      };
    }
  }

  // 9. Global listener to prevent unhandled leaflet pos, latlng errors and Vite HMR websocket disconnection warnings from halting execution
  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('_leaflet_pos') ||
      msg.includes('WebSocket') ||
      msg.includes('[vite]') ||
      msg.includes('Invalid LatLng object')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const reasonStr = typeof reason === 'string' ? reason : (reason?.message || '');
    if (
      reasonStr.includes('WebSocket') ||
      reasonStr.includes('vite') ||
      reasonStr.includes('closed without opened') ||
      reasonStr.includes('Invalid LatLng object')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

export default L;
