"use strict";
/*!
 * OS.js - JavaScript Operating System
 *
 * Copyright (c) 2011-2013, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */
(function() {
  window.OSjs = window.OSjs || {};
  OSjs.GUI = OSjs.GUI || {};

  var _PreviousGUIElement;

  /////////////////////////////////////////////////////////////////////////////
  // HELPERS
  /////////////////////////////////////////////////////////////////////////////

  function createDroppable(el, args) {
    args = args || {};

    args.accept = args.accept || null;
    args.effect = args.effect || 'move';
    args.mime   = args.mime   || 'application/json';
    args.files  = args.files  || true;

    if ( OSjs.Utils.isIE() ) {
      args.mime = "text";
    }

    args.onFilesDropped = args.onFilesDropped || function() { return true; };
    args.onItemDropped  = args.onItemDropped  || function() { return true; };
    args.onEnter        = args.onEnter        || function() { return true; };
    args.onOver         = args.onOver         || function() { return true; };
    args.onLeave        = args.onLeave        || function() { return true; };
    args.onDrop         = args.onDrop         || function() { return true; };

    var _onDrop = function(ev, el) {
      ev.stopPropagation();
      ev.preventDefault();

      args.onDrop.call(this, ev, el);
      if ( !ev.dataTransfer ) { return true; }

      if ( args.files ) {
        var files = ev.dataTransfer.files;
        if ( files && files.length ) {
          return args.onFilesDropped.call(this, ev, el, files, args);
        }
      }

      var data;
      var self = this;
      try {
        data = ev.dataTransfer.getData(args.mime);
      } catch ( e ) {
        console.warn('Failed to drop: ' + e);
      }
      if ( data ) {
        var item = JSON.parse(data);
        if ( args.accept === null || args.accept == item.type ) {
          return args.onItemDropped.call(self, ev, el, item, args);
        }
      }

      return false;
    };

    el.addEventListener('drop', function(ev) {
      return _onDrop(ev, this);
    }, false);

    el.addEventListener('dragenter', function(ev) {
      return args.onEnter.call(this, ev, this, args);
    }, false);

    el.addEventListener('dragover', function(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.dataTransfer.dropEffect = args.effect;
      return args.onOver.call(this, ev, this, args);
    }, false);

    el.addEventListener('dragleave', function(ev) {
      return args.onLeave.call(this, ev, this, args);
    }, false);
  }

  function createDraggable(el, args) {
    args        = args        || {};
    args.type   = args.type   || null;
    args.effect = args.effect || 'move';
    args.data   = args.data   || null;
    args.mime   = args.mime   || 'application/json';

    args.onStart    = args.onStart    || function() { return true; };
    args.onEnd      = args.onEnd      || function() { return true; };

    if ( OSjs.Utils.isIE() ) {
      args.mime = "text";
    }

    var _toString = function(mime) {
      return JSON.stringify({
        type:   args.type,
        effect: args.effect,
        data:   args.data,
        mime:   args.mime
      });
    };

    el.setAttribute("draggable", "true");
    el.addEventListener('dragstart', function(ev) {
      this.style.opacity = '0.4';
      if ( ev.dataTransfer ) {
        try {
          ev.dataTransfer.effectAllowed = args.effect;
          ev.dataTransfer.setData(args.mime, _toString(args.mime));
        } catch ( e ) {
          console.warn("Failed to dragstart: " + e);
        }
      }

      return args.onStart(ev, this, args);
    }, false);

    el.addEventListener('dragend', function(ev) {
      this.style.opacity = '1.0';

      return args.onEnd(ev, this, args);
    }, false);
  }

  function getFileIcon(filename, mime, type, icon, size) {
    if ( !filename ) { throw "Filename is required for getFileIcon()"; }
    type = type || 'file';
    icon = icon || 'mimetypes/gnome-fs-regular.png';
    size = size || '16x16';

    if ( type == 'dir' ) {
      icon = 'places/folder.png';
    } else if ( type == 'file' ) {
      if ( mime ) {
        if ( mime.match(/^application\/(x\-python|javascript)/) || mime.match(/^text\/(html|xml|css)/) ) {
          icon = 'mimetypes/stock_script.png';
        } else if ( mime.match(/^text\//) ) {
          icon = 'mimetypes/txt.png';
        } else if ( mime.match(/^audio\//) ) {
          icon = 'mimetypes/sound.png';
        } else if ( mime.match(/^video\//) ) {
          icon = 'mimetypes/video.png';
        } else if ( mime.match(/^image\//) ) {
          icon = 'mimetypes/image.png';
        } else if ( mime.match(/^application\//) ) {
          icon = 'mimetypes/binary.png';
        } else if ( mime.match(/^osjs\/document/) ) {
          icon = 'mimetypes/gnome-mime-application-msword.png';
        }
      }
    }

    return OSjs.API.getThemeResource(icon, 'icon', size);
  }

  /**
   * GUI Element
   *
   * options:
   *  onItemDropped   Function      Callback - When internal object dropped (requires dnd enabled)
   *  onFilesDropped  Function      Callback - When external file object dropped (requires dnd enabled)
   *  dnd             bool          Enable DnD (Default = false)
   *  dndDrop         bool          Enable DnD Droppable (Default = DnD)
   *  dndDrag         bool          Enable DnD Draggable (Default = DnD)
   *  dndOpts         Object        DnD Options
   *  focusable       bool          If element is focusable (Default = true)
   */
  var GUIElement = (function() {
    var _Count = 0;

    return function(name, opts) {
      opts = opts || {};

      this.name           = name || ('Unknown_' + _Count);
      this.opts           = opts || {};
      this.id             = _Count;
      this.destroyed      = false;
      this.focused        = false;
      this.wid            = 0; // Set in Window::_addGUIElement()
      this.hasChanged     = false;
      this.hasCustomKeys  = opts.hasCustomKeys === true;
      this.onItemDropped  = opts.onItemDropped  || function() {};
      this.onFilesDropped = opts.onFilesDropped || function() {};
      this._onFocusWindow = function() {};
      this.$element       = null;
      this.inited         = false;
      this._window        = null;
      this._hooks         = {
        focus   : [],
        blur    : [],
        destroy : []
      };

      if ( typeof this.opts.dnd === 'undefined' ) {
        this.opts.dnd     = false;
      }
      if ( typeof this.opts.dndDrop === 'undefined' ) {
        this.opts.dndDrop = this.opts.dnd;
      }
      if ( typeof this.opts.dndDrag === 'undefined' ) {
        this.opts.dndDrag = this.opts.dnd;
      }
      if ( typeof this.opts.dndOpts === 'undefined' ) {
        this.opts.dndOpts = {};
      }
      if ( typeof this.opts.focusable === 'undefined' ) {
        this.opts.focusable = true;
      }

      this.init();
      _Count++;
    };
  })();

  GUIElement.prototype.init = function(className, tagName) {
    tagName = tagName || 'div';

    var self = this;

    var classNames = [
      'GUIElement',
      'GUIElement_' + this.id,
      OSjs.Utils.$safeName(className),
      OSjs.Utils.$safeName(this.name)
    ];

    this.$element = document.createElement(tagName);
    this.$element.className = classNames.join(' ');

    if ( this.opts.dnd && this.opts.dndDrop && OSjs.Compability.dnd ) {
      var opts = this.opts.dndOpts;
      opts.onItemDropped = function(ev, el, item) {
        return self.onItemDropped.call(self, ev, el, item);
      };
      opts.onFilesDropped = function(ev, el, files) {
        return self.onFilesDropped.call(self, ev, el, files);
      };

      createDroppable(this.$element, opts);
    }

    if ( this.opts.focusable ) {
      this._addEventListener(this.$element, 'mousedown', function(ev) {
        self._onFocus(ev);
      });
    }

    return this.$element;
  };

  GUIElement.prototype.update = function() {
    this.inited = true;
  };

  GUIElement.prototype.destroy = function() {
    if ( this.destroyed ) { return; }

    this.destroyed = true;
    this._fireHook('destroy');
    if ( this.$element && this.$element.parentNode ) {
      this.$element.parentNode.removeChild(this.$element);
    }
    this._hooks = {};
  };

  GUIElement.prototype._addEvent = function(el, ev, callback) {
    el[ev] = callback;
    this._addHook('destroy', function() {
      el[ev] = null;
    });
  };

  GUIElement.prototype._addEventListener = function(el, ev, callback) {
    el.addEventListener(ev, callback, false);

    this._addHook('destroy', function() {
      el.removeEventListener(ev, callback, false);
    });
  };

  GUIElement.prototype._addHook = function(k, func) {
    if ( typeof func === 'function' && this._hooks[k] ) {
      this._hooks[k].push(func);
    }
  };

  GUIElement.prototype._fireHook = function(k, args) {
    args = args || {};
    if ( this._hooks[k] ) {
      for ( var i = 0, l = this._hooks[k].length; i < l; i++ ) {
        if ( !this._hooks[k][i] ) { continue; }
        try {
          this._hooks[k][i].apply(this, args);
        } catch ( e ) {
          console.warn("GUIElement::_fireHook() failed to run hook", k, i, e);
        }
      }
    }
  };

  GUIElement.prototype.getRoot = function() {
    return this.$element;
  };

  GUIElement.prototype.onDndDrop = function(ev) {
    return true;
  };

  GUIElement.prototype.onKeyPress = function(ev) {
    if ( this.hasCustomKeys ) { return false; }
    if ( !this.focused ) { return false; }
    return true;
  };

  GUIElement.prototype._onFocus = function(ev) {
    ev.stopPropagation();
    OSjs.GUI.blurMenu();

    this.focus();
    this._onFocusWindow.call(this, ev);
  };

  GUIElement.prototype.focus = function() {
    if ( !this.opts.focusable ) { return false; }
    if ( this.focused ) { return false; }
    if ( _PreviousGUIElement && _PreviousGUIElement.id != this.id ) {
      _PreviousGUIElement.blur();
    }
    console.debug("GUIElement::focus()", this.id, this.name);
    this.focused = true;
    this._fireHook('focus');
    _PreviousGUIElement = this;
    return true;
  };

  GUIElement.prototype.blur = function() {
    if ( !this.opts.focusable ) { return false; }
    if ( !this.focused ) { return false; }
    console.debug("GUIElement::blur()", this.id, this.name);
    this.focused = false;
    this._fireHook('blur');
    return true;
  };

  GUIElement.prototype._setWindow = function(w) {
    this.wid      = w._wid;
    this._window  = w;

    this._onFocusWindow = function() {
      w._focus();
    };
  };

  /**
   * _Input
   *
   * options: (See GUIElement for more)
   *  disabled        bool          HTML Input disabled ?
   *  value           String        HTML Input value
   *  label           String        Label value
   *  placeholder     String        Placeholder value (HTML5)
   *  onChange        Function      Callback - When value changed
   *  onClick         Function      Callback - When clicked
   *  onKeyPress      Function      Callback - When key pressed
   *
   *  Please not that not all of these options applies to all
   *  implemented input elements!
   */
  var _Input = function(className, tagName, name, opts) {
    opts = opts || {};
    opts.hasCustomKeys = true;

    this.$input       = null;
    this.type         = tagName === 'input' ? (opts.type || 'text') : null;
    this.disabled     = opts.disabled     || false;
    this.value        = opts.value        || '';
    this.label        = opts.label        || '';
    this.placeholder  = opts.placeholder  || '';
    this.className    = className;
    this.tagName      = tagName;
    this.onChange     = opts.onChange     || function() {};
    this.onClick      = opts.onClick      || function() {};
    this.onKeyPress   = opts.onKeyPress   || function() {};

    GUIElement.apply(this, [name, opts]);
  };

  _Input.prototype = Object.create(GUIElement.prototype);

  _Input.prototype.init = function() {
    var self = this;
    var el = GUIElement.prototype.init.apply(this, [this.className]);
    this.$input = document.createElement(this.tagName);

    if ( this.tagName == 'input' ) {
      this.$input.type = this.type;
      if ( this.type === 'text' || this.type === 'password' ) {
        if ( this.placeholder ) {
          this.$input.setAttribute('placeholder', this.placeholder);
        }

        this._addEventListener(this.$input, 'keypress', function(ev) {
          self.onKeyPress.apply(self, [ev]);
        });
      }
    }

    if ( this.tagName == 'button' ) {
      if ( this.opts.icon ) {
        var img = document.createElement('img');
        img.alt = '';
        img.src = this.opts.icon;
        this.$input.appendChild(img);
      }
      this.$input.appendChild(document.createTextNode(this.value || this.label));
      this._addEvent(this.$input, 'onclick', function(ev) {
        if ( self.isDisabled() ) { return; }
        self.onClick.apply(self, [this, ev]);
      });
    } else {
      this._addEvent(this.$input, 'onchange', function(ev) {
        self.onChange.apply(self, [this, ev, self.getValue()]);
      });
    }

    el.appendChild(this.$input);

    this.setDisabled(this.disabled);
    this.setValue(this.value);
    return el;
  };

  _Input.prototype.blur = function() {
    if ( GUIElement.prototype.blur.apply(this, arguments) ) {
      this.$input.blur();
    }
    return false;
  };

  _Input.prototype.focus = function() {
    if ( GUIElement.prototype.focus.apply(this, arguments) ) {
      this.$input.focus();
    }
    return false;
  };

  _Input.prototype.setDisabled = function(d) {
    this.disabled = d;
    if ( d ) {
      this.$input.setAttribute("disabled", "disabled");
    } else {
      this.$input.removeAttribute("disabled");
    }
  };

  _Input.prototype.isDisabled = function() {
    return this.disabled;
  };

  _Input.prototype.setValue = function(val) {
    if ( this.tagName === 'button' ) {
      return;
    }
    this.value = val;
    this.$input.value = val;
  };

  _Input.prototype.getValue = function() {
    if ( this.tagName === 'button' ) {
      return null;
    }
    return this.$input.value;
  };

  /**
   * Data View Base Class
   *
   * This is for handling data lists in some sort of view
   *
   * options: (See GUIElement for more)
   *  onSelect          Function        Callback - When item is selected (clicked item)
   *  onActivate        Function        Callback - When item is activated (double-click item)
   *  onContextMenu     Function        Callback - When item menu is activated (right click on item)
   *  onViewContextMenu Function        Callback - When view menu is activated (right click background)
   *  onCreateItem      Function        Callback - When item is created
   *  data              Array           Data (Items)
   *  indexKey          String          What key is used as an index (usefull for autoselecting last selected row on re-render)
   *  render            bool            Render on create (default = true when data is supplied)
   */
  var _DataView = function(className, name, opts) {
    opts = opts || {};

    this.className  = className;
    this.$view      = null;
    this.selected   = null;
    this.data       = [];

    this.indexKey           = opts.indexKey           || null;
    this.onSelect           = opts.onSelect           || function(ev, el, item) {};
    this.onActivate         = opts.onActivate         || function(ev, el, item) {};
    this.onContextMenu      = opts.onContextMenu      || function(ev, el, item) {};
    this.onViewContextMenu  = opts.onViewContextMenu  || function(ev) {};
    this.onCreateItem       = opts.onCreateItem       || function(el, iter) {};

    GUIElement.apply(this, [name, opts]);
  };

  _DataView.prototype = Object.create(GUIElement.prototype);

  _DataView.prototype.update = function() {
    GUIElement.prototype.update.apply(this, arguments);

    // Automatic render when user supplies data
    if ( this.opts.data ) {
      if ( typeof this.opts.render === 'undefined' || this.opts.render === true ) {
      //if ( typeof this.opts.row === 'undefined' || this.opts.render === true ) {
        this.render(this.opts.data);
      }
    }
  };

  _DataView.prototype.init = function(className, view) {
    var self = this;
    var el = GUIElement.prototype.init.apply(this, [className]);
    this.$view = document.createElement('div');
    if ( typeof view === 'undefined' || view === true ) {
      el.appendChild(this.$view);
      this._addEvent(this.$view, 'oncontextmenu', function(ev) {
        ev.stopPropagation(); // Or else eventual ContextMenu is blurred
        ev.preventDefault();

        self.onViewContextMenu.call(self, ev);

        return false;
      });
    }
    return el;
  };

  _DataView.prototype.clear = function() {
    this.render([], true);
  };

  _DataView.prototype.refresh = function() {
    this.render(this.data, false);
  };

  _DataView.prototype.render = function(data, reset) {
    if ( !this.$view ) { return false; }

    var self = this;
    var reselect = null;
    var scrollTop = 0;

    if ( !reset ) {
      if ( this.indexKey ) {
        if ( this.selected ) {
          reselect = this.selected[this.indexKey];
          scrollTop = this.$view.scrollTop;
        }
      }
    }

    if ( typeof data !== 'undefined' ) {
      this.setData(data);
    }
    this._onSelect(null, null);

    this._onRender();

    if ( reselect ) {
      setTimeout(function() {
        self.setSelected(reselect, self.indexKey);
        if ( self.$view ) {
          self.$view.scrollTop = scrollTop;
        }
      }, 10);
    } else {
      this.$view.scrollTop = 0;
    }

    return true;
  };

  _DataView.prototype._onRender = function() {
  };

  _DataView.prototype.__onSelect = function(ev, item, scroll) {
    if ( this.selected && this.selected._element ) {
      OSjs.Utils.$removeClass(this.selected._element, 'Active');
    }

    this.selected = null;

    if ( item && item._element ) {
      this.selected  = item;
      OSjs.Utils.$addClass(this.selected._element, 'Active');

      if ( scroll ) {
        var pos = OSjs.Utils.$position(this.selected._element, this.$view);
        if ( pos !== null && 
             (pos.top > (this.$view.scrollTop + this.$view.offsetHeight) || 
             (pos.top < this.$view.scrollTop)) ) {
          this.$view.scrollTop = pos.top;
        }
      }
    }
  };

  _DataView.prototype._onSelect = function(ev, item, scroll, callback) {
    this.__onSelect(ev, item, scroll);

    if ( typeof callback === 'undefined' || callback === true ) {
      if ( ev !== null && item !== null ) {
        this.onSelect.apply(this, [ev, (item ? item._element : null), item]);
      }
    }
    return this.selected;
  };

  _DataView.prototype._onActivate = function(ev, item, callback) {
    if ( typeof callback === 'undefined' || callback === true ) {
      this.onActivate.apply(this, [ev, (item ? item._element : null), item]);
    }
    return item;
  };

  _DataView.prototype._onContextMenu = function(ev, item) {
    this._onSelect(ev, item);

    this.onContextMenu.apply(this, [ev, item._element, item]);
    return item;
  };

  _DataView.prototype.onKeyPress = function(ev) {
    if ( this.destroyed ) { return false; }
    if ( !GUIElement.prototype.onKeyPress.apply(this, arguments) ) { return false; }

    var valid = [OSjs.Utils.Keys.UP, OSjs.Utils.Keys.DOWN, OSjs.Utils.Keys.LEFT, OSjs.Utils.Keys.RIGHT, OSjs.Utils.Keys.ENTER];
    if ( !OSjs.Utils.inArray(valid, ev.keyCode) ) {
      return true;
    }
    if ( this.className == 'TreeView' ) {
      // TreeView has custom code
      return true;
    }

    ev.preventDefault();
    if ( this.selected ) {

      var idx  = this.selected._index;
      var tidx = idx;
      var len  = this.data.length;
      var skip = 1;
      var prev = idx;

      if ( this.className == 'IconView' ) {
        if ( this.$view ) {
          var el = this.$view.getElementsByTagName('LI')[0];
          if ( el ) {
            var ow = el.offsetWidth;
            try {
              ow += OSjs.Utils.$getStyle(el, 'padding-left').replace('px', '') << 0;
              ow += OSjs.Utils.$getStyle(el, 'padding-right').replace('px', '') << 0;
              ow += OSjs.Utils.$getStyle(el, 'margin-left').replace('px', '') << 0;
              ow += OSjs.Utils.$getStyle(el, 'margin-right').replace('px', '') << 0;
            } catch ( e ) {}
            skip = Math.floor(this.$view.offsetWidth / ow);
          }
        }
      }

      if ( idx >= 0 && idx < len  ) {
        if ( ev.keyCode === OSjs.Utils.Keys.UP ) {
          idx -= skip;
          if ( idx < 0 ) { idx = prev; }
        } else if ( ev.keyCode === OSjs.Utils.Keys.DOWN ) {
          idx += skip;
          if ( idx >= len ) { idx = prev; }
        } else if ( ev.keyCode === OSjs.Utils.Keys.LEFT ) {
          idx--;
        } else if ( ev.keyCode === OSjs.Utils.Keys.RIGHT ) {
          idx++;
        } else if ( ev.keyCode === OSjs.Utils.Keys.ENTER ) {
          this._onActivate(ev, this.data[idx]);
          return true;
        }

        if ( idx != tidx ) {
          this.setSelectedIndex(idx, true);
        }
      }
    }
    return true;
  };

  _DataView.prototype.setData = function(data, render) {
    this.data = data;
    if ( render ) {
      this.render();
    }
  };

  _DataView.prototype.setSelected = function(val, key, scrollTo) {
    if ( !key && !val ) {
      this._onSelect(null, null, false);
      return true;
    }

    var item = this.getItemByKey(key, val);
    if ( item ) {
      this._onSelect(null, item, scrollTo);
      return true;
    }
    return false;
  };

  _DataView.prototype.setSelectedIndex = function(idx, scrollTo) {
    if ( this.data[idx] ) {
      this._onSelect(null, this.data[idx], scrollTo);
    }
  };

  _DataView.prototype.setItems = function() {
    this.setData.apply(this, arguments);
  };

  _DataView.prototype.getItemByKey = function(key, val) {
    var data = this.data;
    for ( var i = 0, l = data.length; i < l; i++ ) {
      if ( data[i][key] == val ) {
        return data[i];
      }
    }
    return null;
  };

  _DataView.prototype.getItem = function(idx) {
    return this.data[idx];
  };

  _DataView.prototype.getSelected = function() {
    return this.selected;
  };

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTS
  /////////////////////////////////////////////////////////////////////////////

  OSjs.GUI.GUIElement       = GUIElement;
  OSjs.GUI._DataView        = _DataView;
  OSjs.GUI._Input           = _Input;
  OSjs.GUI.createDraggable  = createDraggable;
  OSjs.GUI.createDroppable  = createDroppable;
  OSjs.GUI.getFileIcon      = getFileIcon;

})();