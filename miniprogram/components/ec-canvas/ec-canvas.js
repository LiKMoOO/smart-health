// components/ec-canvas/ec-canvas.js
// 引入echarts核心模块
import * as echarts from './echarts';

Component({
  properties: {
    canvasId: {
      type: String,
      value: 'ec-canvas'
    },
    ec: {
      type: Object
    },
    forceUse: {
      type: Boolean,
      value: false
    }
  },

  data: {
    isUseNewCanvas: false
  },

  ready: function() {
    // 判断是否使用新版canvas
    if (!this.data.ec) {
      console.warn('组件需绑定 ec 变量，例：<ec-canvas id="mychart" canvas-id="mychart" ec="{{ ec }}"></ec-canvas>');
      return;
    }

    if (!this.data.ec.lazyLoad) {
      this.init();
    }
  },

  methods: {
    init: function(callback) {
      const version = wx.getSystemInfoSync().SDKVersion;
      const canUseNewCanvas = compareVersion(version, '2.9.0') >= 0;
      const forceUseOldCanvas = this.data.forceUse;
      
      const isUseNewCanvas = canUseNewCanvas && !forceUseOldCanvas;
      this.setData({ isUseNewCanvas });

      if (forceUseOldCanvas && canUseNewCanvas) {
        console.warn('开发者强制使用旧canvas，建议关闭');
      }

      if (isUseNewCanvas) {
        // 新版canvas
        this.initByNewWay(callback);
      } else {
        // 旧版canvas
        const ctx = wx.createCanvasContext(this.data.canvasId, this);
        this.ctx = ctx;
        const canvas = new WxCanvas(ctx, this.data.canvasId, false);
        echarts.setCanvasCreator(() => {
          return canvas;
        });

        const query = wx.createSelectorQuery().in(this);
        query.select('.ec-canvas').boundingClientRect(res => {
          if (typeof callback === 'function') {
            this.chart = callback(canvas, res.width, res.height, this.data.canvasId);
          } else if (this.data.ec && typeof this.data.ec.onInit === 'function') {
            this.chart = this.data.ec.onInit(canvas, res.width, res.height, this.data.canvasId);
          } else {
            this.triggerEvent('init', {
              canvas: canvas,
              width: res.width,
              height: res.height,
              canvasId: this.data.canvasId
            });
          }
        }).exec();
      }
    },

    initByNewWay(callback) {
      const query = wx.createSelectorQuery().in(this);
      query.select('.ec-canvas').fields({ node: true, size: true }).exec(res => {
        const canvasNode = res[0].node;
        this.canvasNode = canvasNode;
        const canvasWidth = res[0].width;
        const canvasHeight = res[0].height;

        const ctx = canvasNode.getContext('2d');
        const canvas = new WxCanvas(ctx, this.data.canvasId, true, canvasNode);
        echarts.setCanvasCreator(() => {
          return canvas;
        });

        if (typeof callback === 'function') {
          this.chart = callback(canvas, canvasWidth, canvasHeight);
        } else if (this.data.ec && typeof this.data.ec.onInit === 'function') {
          this.chart = this.data.ec.onInit(canvas, canvasWidth, canvasHeight);
        } else {
          this.triggerEvent('init', {
            canvas: canvas,
            width: canvasWidth,
            height: canvasHeight
          });
        }
      });
    },

    canvasToTempFilePath(opt) {
      if (this.data.isUseNewCanvas) {
        // 新版
        const query = wx.createSelectorQuery().in(this);
        query.select('.ec-canvas')
          .fields({ node: true, size: true })
          .exec(res => {
            const canvasNode = res[0].node;
            opt.canvas = canvasNode;
            wx.canvasToTempFilePath(opt);
          });
      } else {
        // 旧版
        if (!opt.canvasId) {
          opt.canvasId = this.data.canvasId;
        }
        ctx.draw(true, () => {
          wx.canvasToTempFilePath(opt, this);
        });
      }
    },

    touchStart(e) {
      if (this.chart && e.touches.length > 0) {
        var touch = e.touches[0];
        var handler = this.chart.getZr().handler;
        handler.dispatch('mousedown', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.dispatch('mousemove', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.processGesture(wrapTouch(e), 'start');
      }
    },

    touchMove(e) {
      if (this.chart && e.touches.length > 0) {
        var touch = e.touches[0];
        var handler = this.chart.getZr().handler;
        handler.dispatch('mousemove', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.processGesture(wrapTouch(e), 'change');
      }
    },

    touchEnd(e) {
      if (this.chart) {
        const touch = e.changedTouches ? e.changedTouches[0] : {};
        var handler = this.chart.getZr().handler;
        handler.dispatch('mouseup', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.dispatch('click', {
          zrX: touch.x,
          zrY: touch.y
        });
        handler.processGesture(wrapTouch(e), 'end');
      }
    }
  }
});

// 判断版本
function compareVersion(v1, v2) {
  v1 = v1.split('.');
  v2 = v2.split('.');
  const len = Math.max(v1.length, v2.length);

  while (v1.length < len) {
    v1.push('0');
  }
  while (v2.length < len) {
    v2.push('0');
  }

  for (let i = 0; i < len; i++) {
    const num1 = parseInt(v1[i]);
    const num2 = parseInt(v2[i]);

    if (num1 > num2) {
      return 1;
    } else if (num1 < num2) {
      return -1;
    }
  }
  return 0;
}

// 处理触摸事件
function wrapTouch(event) {
  for (let i = 0; i < event.touches.length; ++i) {
    const touch = event.touches[i];
    touch.offsetX = touch.x;
    touch.offsetY = touch.y;
  }
  return event;
}

// Canvas适配器
class WxCanvas {
  constructor(ctx, canvasId, isNew, canvasNode) {
    this.ctx = ctx;
    this.canvasId = canvasId;
    this.chart = null;
    this.isNew = isNew;
    if (isNew) {
      this.canvasNode = canvasNode;
    }
  }

  getContext(contextType) {
    if (contextType === '2d') {
      return this.ctx;
    }
  }

  // Canvas兼容
  setChart(chart) {
    this.chart = chart;
  }

  attachEvent() {
    // noop
  }

  detachEvent() {
    // noop
  }

  // 适配器
  addEventListener() {
    // noop
  }

  removeEventListener() {
    // noop
  }

  // 获取像素比例
  getDpr() {
    return wx.getSystemInfoSync().pixelRatio || 1;
  }

  // 后期支持高清设置
  measureText(text) {
    return this.ctx.measureText(text);
  }
} 