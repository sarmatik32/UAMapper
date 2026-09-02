import L from 'leaflet';

// Global comprehensive safeguard for Leaflet to eliminate "_leaflet_pos" and animation errors on unmounted/intermediate elements
if (typeof window !== 'undefined' && L) {
  // 1. Safeguard L.DomUtil.getPosition and setPosition
  if (L.DomUtil) {
    L.DomUtil.getPosition = function (el: any): L.Point {
      if (!el || typeof el !== 'object') {
        return new L.Point(0, 0);
      }
      return el._leaflet_pos || new L.Point(0, 0);
    };

    L.DomUtil.setPosition = function (el: any, point: L.Point): void {
      if (!el || typeof el !== 'object') return;
      el._leaflet_pos = point;
      try {
        if (L.Browser && L.Browser.any3d) {
          L.DomUtil.setTransform(el, point);
        } else if (el.style) {
          el.style.left = (point ? point.x : 0) + 'px';
          el.style.top = (point ? point.y : 0) + 'px';
        }
      } catch {}
    };
  }

  // 2. Safeguard L.Map.prototype._getMapPanePos
  if (L.Map && L.Map.prototype) {
    (L.Map.prototype as any)._getMapPanePos = function (): L.Point {
      if (!this._mapPane) return new L.Point(0, 0);
      try {
        return (this._mapPane as any)._leaflet_pos || L.DomUtil.getPosition(this._mapPane) || new L.Point(0, 0);
      } catch {
        return new L.Point(0, 0);
      }
    };
  }

  // 3. Safeguard L.PosAnimation
  if (L.PosAnimation && L.PosAnimation.prototype) {
    const origRun = L.PosAnimation.prototype.run;
    if (origRun) {
      L.PosAnimation.prototype.run = function (el: any, newPos: L.Point, duration?: number, easeLinearity?: number) {
        if (!el || typeof el !== 'object') return;
        if (!el._leaflet_pos) {
          el._leaflet_pos = new L.Point(0, 0);
        }
        try {
          origRun.call(this, el, newPos, duration, easeLinearity);
        } catch (err) {
          // Suppress PosAnimation error on detached element
        }
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
    const origUpdatePosition = (L.Popup.prototype as any)._updatePosition;
    if (origUpdatePosition) {
      (L.Popup.prototype as any)._updatePosition = function () {
        if (!this._container || !this._map) return;
        try {
          origUpdatePosition.call(this);
        } catch {}
      };
    }
  }

  if (L.Tooltip && L.Tooltip.prototype) {
    const origUpdatePosition = (L.Tooltip.prototype as any)._updatePosition;
    if (origUpdatePosition) {
      (L.Tooltip.prototype as any)._updatePosition = function () {
        if (!this._container || !this._map) return;
        try {
          origUpdatePosition.call(this);
        } catch {}
      };
    }
  }

  // 8. Global listener to prevent unhandled leaflet pos errors and Vite HMR websocket disconnection warnings from halting execution
  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (msg.includes('_leaflet_pos') || msg.includes('WebSocket') || msg.includes('[vite]')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const reasonStr = typeof reason === 'string' ? reason : (reason?.message || '');
    if (reasonStr.includes('WebSocket') || reasonStr.includes('vite') || reasonStr.includes('closed without opened')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

export default L;
