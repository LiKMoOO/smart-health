// components/ec-canvas/echarts.js
/**
 * 由于完整的echarts.min.js文件较大，这里只提供一个简化版本
 * 实际项目中建议下载官方的微信小程序版本：
 * https://github.com/ecomfe/echarts-for-weixin
 */

let _canvasCreator = null;
const _renderFuncs = []; // 存储渲染函数

// 设置Canvas创建器 (由 ec-canvas.js 调用)
export function setCanvasCreator(creator) {
  _canvasCreator = creator;
}

// (如果需要，但 ec-canvas.js 目前不直接调用 getCanvasInstance)
// export function getCanvasInstance() {
//   if (typeof _canvasCreator === 'function') {
//     return _canvasCreator();
//   }
//   return null;
// }

// 内部函数，用于添加特定图表的渲染逻辑
function addRenderFunction(func) {
  _renderFuncs.push(func);
}

// 初始化图表 (由 chart_helper.js 调用)
export function init(canvas, width, height, dpr) {
  // 清空上次init可能遗留的渲染函数，确保每个图表实例有自己的渲染逻辑
  _renderFuncs.length = 0;

  const chart = {
    canvas: canvas, // 这是 WxCanvas 实例
    options: null,
    setOption: function(options) {
      this.options = options;
      this._renderChart();
    },
    _renderChart: function() {
      if (!this.options) return;
      
      // WxCanvas 实例上应该有 getContext 方法
      const ctx = this.canvas.getContext('2d'); 
      if (!ctx) {
        console.error('[echarts.js] 获取 Canvas Context 失败');
        return;
      }
      
      // 使用传入 init 的 width 和 height 进行清屏和渲染
      ctx.clearRect(0, 0, width, height);
      
      // 执行所有注册的渲染函数
      _renderFuncs.forEach(func => func(ctx, this.options, width, height));
    },
    getZr: function() {
      return {
        handler: {
          dispatch: function() {},
          processGesture: function() {}
        }
      };
    }
    // addRenderFunction 不再是 chart 实例的方法，而是模块内部函数
  };
  
  // 添加默认的线图渲染函数 (支持多系列)
  addRenderFunction(function(ctx, options, canvasWidth, canvasHeight) {
    console.log('[echarts.js render] 开始渲染. Canvas尺寸:', canvasWidth, canvasHeight);
    console.log('[echarts.js render] 接收到的图表配置 (部分):', { series: options.series, xAxis: options.xAxis }); // 打印关键配置

    if (!options.series || !options.series.length) {
        console.log('[echarts.js render] 没有系列数据，停止渲染。');
        return;
    }
    
    let minY = Infinity;
    let maxY = -Infinity;
    options.series.forEach(series => {
      const data = series.data || [];
      data.forEach(item => {
        const val = typeof item === 'object' ? item.value : item;
        // 确保值是数字
        if (typeof val === 'number' && isFinite(val)) { 
            minY = Math.min(minY, val);
            maxY = Math.max(maxY, val);
        }
      });
    });
    console.log('[echarts.js render] 计算出的 Y 轴范围 (minY, maxY):', minY, maxY);
    
    const padding = 20;
    const chartWidth = canvasWidth - padding * 2;
    const chartHeight = canvasHeight - padding * 2;
    console.log('[echarts.js render] 图表绘制区域尺寸 (chartWidth, chartHeight):', chartWidth, chartHeight);
    const categories = options.xAxis?.data || [];
    const dataLength = categories.length; // 使用类目轴长度作为主要参考
    console.log('[echarts.js render] 类目轴数据 (categories):', categories);

    // 检查图表区域尺寸是否有效
    if (chartWidth <= 0 || !isFinite(chartWidth) || chartHeight <= 0 || !isFinite(chartHeight)) {
        console.warn('[echarts.js render] 图表绘制区域尺寸无效，停止渲染。');
        return;
    }

    // 绘制坐标轴
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvasHeight - padding);
    ctx.lineTo(canvasWidth - padding, canvasHeight - padding);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 绘制 Y 轴标签 (简化)
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    if (isFinite(minY) && isFinite(maxY)) {
        const minYLabel = minY.toFixed(1);
        const maxYLabel = maxY.toFixed(1);
        console.log('[echarts.js render] 绘制 Y 轴标签:', minYLabel, maxYLabel);
        ctx.fillText(minYLabel, padding - ctx.measureText(minYLabel).width - 5, canvasHeight - padding);
        ctx.fillText(maxYLabel, padding - ctx.measureText(maxYLabel).width - 5, padding + 10);
    } else {
        console.log('[echarts.js render] Y 轴范围无效，跳过 Y 轴标签绘制。');
    }
    
    // 绘制 X 轴标签 (简化)
    if (categories.length > 0) {
        console.log('[echarts.js render] 绘制 X 轴标签:', categories[0], categories[categories.length - 1]);
        ctx.fillText(categories[0], padding, canvasHeight - padding + 15);
        if (categories.length > 1) {
            ctx.fillText(categories[categories.length - 1], canvasWidth - padding - ctx.measureText(categories[categories.length - 1]).width, canvasHeight - padding + 15);
        }
    } else {
        console.log('[echarts.js render] 无类目数据，跳过 X 轴标签绘制。');
    }

    // 遍历每个系列并绘制
    options.series.forEach((series, seriesIndex) => {
        console.log(`[echarts.js render] 开始处理系列 ${seriesIndex}: ${series.name}`);
        const data = series.data || [];
        const currentDataLength = data.length;
        if (currentDataLength < 1) {
            console.log(`[echarts.js render] 系列 ${seriesIndex} 无数据点。`);
            return;
        }
        console.log(`[echarts.js render] 系列 ${seriesIndex} 数据点:`, JSON.stringify(data));

        const color = series.itemStyle?.color || '#4e8df7';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        let pointsDrawn = 0;
        data.forEach((item, index) => {
            const count = dataLength > 0 ? dataLength : currentDataLength; // 优先使用类目轴长度
            if (index >= count) return; 
            
            const val = typeof item === 'object' ? item.value : item;
            // 再次检查值是否有效
            if (typeof val !== 'number' || !isFinite(val) || !isFinite(minY) || !isFinite(maxY)) {
                console.warn(`[echarts.js render] 系列 ${seriesIndex} 数据点 ${index} 值无效或 Y 轴范围无效，跳过绘制:`, val);
                return;
            }
            
            // 如果只有一个点，X坐标在中间；否则按比例分布
            const x = padding + (count > 1 ? (chartWidth * index) / (count - 1) : chartWidth / 2);
            // 修正 Y 轴比例计算，防止 maxY === minY 时除零
            const yRatio = (maxY === minY) ? 0.5 : (val - minY) / (maxY - minY);
            const y = padding + chartHeight - (chartHeight * yRatio);
            
            console.log(`[echarts.js render] 系列 ${seriesIndex}, 点 ${index}: 值=${val}, 计算坐标 (x, y)=(${x.toFixed(1)}, ${y.toFixed(1)})`);

            if (pointsDrawn === 0) { // 使用 pointsDrawn 确保从第一个有效点开始 moveTo
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            pointsDrawn++;
        });
        if (pointsDrawn > 0) { // 只有画了点才 stroke
            console.log(`[echarts.js render] 绘制系列 ${seriesIndex} 的线段 (共 ${pointsDrawn} 个点)`);
            ctx.stroke();
        } else {
            console.log(`[echarts.js render] 系列 ${seriesIndex} 没有有效点可绘制线段。`);
        }

        // 绘制数据点 (逻辑类似)
        data.forEach((item, index) => {
            const count = dataLength > 0 ? dataLength : currentDataLength;
            if (index >= count) return; 

            const val = typeof item === 'object' ? item.value : item;
            if (typeof val !== 'number' || !isFinite(val) || !isFinite(minY) || !isFinite(maxY)) return;
            
            const x = padding + (count > 1 ? (chartWidth * index) / (count - 1) : chartWidth / 2);
            const yRatio = (maxY === minY) ? 0.5 : (val - minY) / (maxY - minY);
            const y = padding + chartHeight - (chartHeight * yRatio);

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        console.log(`[echarts.js render] 完成绘制系列 ${seriesIndex} 的数据点。`);
    });
    console.log('[echarts.js render] 所有系列处理完毕。');
  });
  
  return chart;
}

// 不再有默认导出，也不再导出名为 echarts 的对象
// export default echarts; 
// export { echarts }; 