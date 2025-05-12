// components/ec-canvas/echarts.js
// 引入ECharts微信小程序版本
/**
 * 由于完整的echarts.min.js文件较大，这里只提供一个简化版本
 * 实际项目中建议下载官方的微信小程序版本：
 * https://github.com/ecomfe/echarts-for-weixin
 */

// 简化版的ECharts核心模块
let echarts = {};

// 设置Canvas创建器
echarts.setCanvasCreator = function(creator) {
  this._creator = creator;
};

// 获取Canvas实例
echarts.getCanvasInstance = function() {
  return this._creator();
};

// 初始化图表
echarts.init = function(canvas, width, height, dpr) {
  const chart = {
    canvas: canvas,
    options: null,
    _renderFuncs: [],
    setOption: function(options) {
      this.options = options;
      this._renderChart();
    },
    _renderChart: function() {
      if (!this.options) return;
      
      const ctx = this.canvas.getContext();
      const { width, height } = this.canvas;
      
      // 清空画布
      ctx.clearRect(0, 0, width, height);
      
      // 执行渲染函数
      this._renderFuncs.forEach(func => func(ctx, this.options));
    },
    getZr: function() {
      return {
        handler: {
          dispatch: function() {},
          processGesture: function() {}
        }
      };
    },
    // 添加渲染函数
    addRenderFunction: function(func) {
      this._renderFuncs.push(func);
    }
  };
  
  // 添加默认渲染函数（简单线图）
  chart.addRenderFunction(function(ctx, options) {
    if (!options.series || !options.series.length) return;
    
    const series = options.series[0];
    const data = series.data || [];
    if (data.length < 2) return;
    
    const color = series.itemStyle?.color || '#4e8df7';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // 计算数据范围
    let minY = Infinity;
    let maxY = -Infinity;
    data.forEach(item => {
      const val = typeof item === 'object' ? item.value : item;
      minY = Math.min(minY, val);
      maxY = Math.max(maxY, val);
    });
    
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 绘制坐标轴
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 绘制折线
    ctx.beginPath();
    data.forEach((item, index) => {
      const val = typeof item === 'object' ? item.value : item;
      const x = padding + (chartWidth * index) / (data.length - 1);
      const y = padding + chartHeight - (chartHeight * (val - minY)) / (maxY - minY || 1);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 绘制数据点
    data.forEach((item, index) => {
      const val = typeof item === 'object' ? item.value : item;
      const x = padding + (chartWidth * index) / (data.length - 1);
      const y = padding + chartHeight - (chartHeight * (val - minY)) / (maxY - minY || 1);
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  });
  
  return chart;
};

export default echarts;
export {
  echarts
}; 