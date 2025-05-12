/**
 * 图表辅助类
 */

/**
 * 初始化折线图
 * @param {Object} options 配置选项
 */
function initLineChart(options) {
  const { canvas, width, height, categories, series, title } = options;
  
  // 引入echarts
  const echarts = require('../components/ec-canvas/echarts');
  
  // 初始化图表
  const chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: wx.getSystemInfoSync().pixelRatio
  });
  canvas.setChart(chart);
  
  // 图表配置
  const option = {
    title: {
      text: title || '',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    grid: {
      containLabel: true,
      left: 20,
      right: 20,
      top: 40,
      bottom: 20
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = `${params[0].name}<br/>`;
        
        params.forEach(param => {
          const color = param.color;
          const seriesName = param.seriesName;
          const value = param.value;
          const unit = param.data.unit || '';
          
          result += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>${seriesName}: ${value}${unit}<br/>`;
        });
        
        return result;
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories || [],
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#999',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#999',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#f3f3f3'
        }
      }
    },
    series: series.map(item => ({
      name: item.name,
      type: 'line',
      smooth: true,
      data: item.data.map((value, index) => ({
        value: value,
        unit: item.unit || ''
      })),
      itemStyle: {
        color: item.color || '#4e8df7'
      },
      lineStyle: {
        width: 2,
        color: item.color || '#4e8df7'
      },
      symbolSize: 6
    }))
  };
  
  // 设置图表配置
  chart.setOption(option);
  
  return chart;
}

/**
 * 初始化柱状图
 * @param {Object} options 配置选项
 */
function initBarChart(options) {
  const { canvas, width, height, categories, series, title } = options;
  
  // 引入echarts
  const echarts = require('../components/ec-canvas/echarts');
  
  // 初始化图表
  const chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: wx.getSystemInfoSync().pixelRatio
  });
  canvas.setChart(chart);
  
  // 图表配置
  const option = {
    title: {
      text: title || '',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    grid: {
      containLabel: true,
      left: 20,
      right: 20,
      top: 40,
      bottom: 20
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: categories || [],
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#999',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: '#999',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#f3f3f3'
        }
      }
    },
    series: series.map(item => ({
      name: item.name,
      type: 'bar',
      data: item.data,
      itemStyle: {
        color: item.color || '#4e8df7'
      },
      barWidth: '40%'
    }))
  };
  
  // 设置图表配置
  chart.setOption(option);
  
  return chart;
}

/**
 * 初始化饼图
 * @param {Object} options 配置选项
 */
function initPieChart(options) {
  const { canvas, width, height, series, title } = options;
  
  // 引入echarts
  const echarts = require('../components/ec-canvas/echarts');
  
  // 初始化图表
  const chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: wx.getSystemInfoSync().pixelRatio
  });
  canvas.setChart(chart);
  
  // 图表配置
  const option = {
    title: {
      text: title || '',
      left: 'center',
      textStyle: {
        fontSize: 14,
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      data: series.map(item => item.name)
    },
    series: [
      {
        type: 'pie',
        radius: '55%',
        center: ['50%', '45%'],
        data: series.map(item => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: item.color
          }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          normal: {
            formatter: '{b}: {c} ({d}%)'
          }
        }
      }
    ]
  };
  
  // 设置图表配置
  chart.setOption(option);
  
  return chart;
}

module.exports = {
  initLineChart,
  initBarChart,
  initPieChart
}; 