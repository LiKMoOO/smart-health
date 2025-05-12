/*
 * wx-charts.js
 * 微信小程序图表工具
 * 简化版本，提供基础的折线图和柱状图功能
 */

class WxChart {
  constructor(options) {
    this.canvasId = options.canvasId;
    this.width = options.width || 300;
    this.height = options.height || 200;
    this.padding = options.padding || 20;
    this.ctx = wx.createCanvasContext(this.canvasId);
    this.title = options.title || '';
    this.type = options.type || 'line'; // 'line' 或 'column'
    this.categories = options.categories || [];
    this.series = options.series || [];
    this.colors = options.colors || ['#2858DF', '#FF7733', '#4CAF50', '#FF5252', '#9C27B0'];
    this.yAxisMin = options.yAxisMin; // 可选的Y轴最小值
    this.yAxisMax = options.yAxisMax; // 可选的Y轴最大值
  }

  // 绘制图表
  draw() {
    this._drawBackground();
    this._drawTitle();
    this._drawAxis();
    
    if (this.type === 'line') {
      this._drawLineChart();
    } else if (this.type === 'column') {
      this._drawColumnChart();
    }
    
    this.ctx.draw();
  }

  // 绘制背景
  _drawBackground() {
    this.ctx.setFillStyle('#ffffff');
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // 绘制标题
  _drawTitle() {
    if (this.title) {
      this.ctx.setFontSize(14);
      this.ctx.setFillStyle('#333333');
      this.ctx.setTextAlign('center');
      this.ctx.fillText(this.title, this.width / 2, 25);
    }
  }

  // 绘制坐标轴
  _drawAxis() {
    const paddingLeft = this.padding * 2; // 左侧留更多空间显示Y轴标签
    const paddingRight = this.padding;
    const paddingTop = this.title ? 40 : 20;
    const paddingBottom = this.padding * 2; // 底部留更多空间显示X轴标签

    // 计算图表区域
    this.chartArea = {
      left: paddingLeft,
      top: paddingTop,
      width: this.width - paddingLeft - paddingRight,
      height: this.height - paddingTop - paddingBottom
    };

    // 计算Y轴范围
    let yMin = this.yAxisMin !== undefined ? this.yAxisMin : Infinity;
    let yMax = this.yAxisMax !== undefined ? this.yAxisMax : -Infinity;
    
    if (yMin === Infinity || yMax === -Infinity) {
      this.series.forEach(series => {
        series.data.forEach(value => {
          if (typeof value === 'object') {
            // 处理多值数据，如血压
            Object.values(value).forEach(v => {
              yMin = Math.min(yMin, v);
              yMax = Math.max(yMax, v);
            });
          } else {
            yMin = Math.min(yMin, value);
            yMax = Math.max(yMax, value);
          }
        });
      });
    }
    
    // 为Y轴添加一点缓冲空间
    const yRange = yMax - yMin;
    yMin = Math.max(0, yMin - yRange * 0.1); // 不小于0
    yMax = yMax + yRange * 0.1;
    
    this.yMin = yMin;
    this.yMax = yMax;

    // 绘制X轴
    this.ctx.beginPath();
    this.ctx.setLineWidth(1);
    this.ctx.setStrokeStyle('#e0e0e0');
    this.ctx.moveTo(this.chartArea.left, this.chartArea.top + this.chartArea.height);
    this.ctx.lineTo(this.chartArea.left + this.chartArea.width, this.chartArea.top + this.chartArea.height);
    this.ctx.stroke();

    // 绘制Y轴
    this.ctx.beginPath();
    this.ctx.moveTo(this.chartArea.left, this.chartArea.top);
    this.ctx.lineTo(this.chartArea.left, this.chartArea.top + this.chartArea.height);
    this.ctx.stroke();

    // 绘制Y轴刻度线和网格线
    const yTickCount = 5;
    const yTickStep = (yMax - yMin) / yTickCount;
    
    for (let i = 0; i <= yTickCount; i++) {
      const y = this.chartArea.top + this.chartArea.height - (i / yTickCount) * this.chartArea.height;
      const value = yMin + i * yTickStep;
      
      // 绘制网格线
      this.ctx.beginPath();
      this.ctx.setLineWidth(1);
      this.ctx.setStrokeStyle('#f0f0f0');
      this.ctx.moveTo(this.chartArea.left, y);
      this.ctx.lineTo(this.chartArea.left + this.chartArea.width, y);
      this.ctx.stroke();
      
      // 绘制刻度值
      this.ctx.setFontSize(10);
      this.ctx.setFillStyle('#666666');
      this.ctx.setTextAlign('right');
      this.ctx.fillText(value.toFixed(1), this.chartArea.left - 5, y + 3);
    }

    // 绘制X轴类别标签
    const categoryCount = this.categories.length;
    if (categoryCount > 0) {
      const xStep = this.chartArea.width / (categoryCount > 1 ? categoryCount - 1 : 1);
      
      this.categories.forEach((category, index) => {
        const x = this.chartArea.left + index * xStep;
        
        // 绘制刻度线
        this.ctx.beginPath();
        this.ctx.setLineWidth(1);
        this.ctx.setStrokeStyle('#e0e0e0');
        this.ctx.moveTo(x, this.chartArea.top + this.chartArea.height);
        this.ctx.lineTo(x, this.chartArea.top + this.chartArea.height + 5);
        this.ctx.stroke();
        
        // 绘制类别标签
        this.ctx.setFontSize(10);
        this.ctx.setFillStyle('#666666');
        this.ctx.setTextAlign('center');
        this.ctx.fillText(category, x, this.chartArea.top + this.chartArea.height + 15);
      });
    }
  }

  // 绘制折线图
  _drawLineChart() {
    this.series.forEach((series, seriesIndex) => {
      const color = this.colors[seriesIndex % this.colors.length];
      const data = series.data;
      const categoryCount = this.categories.length;
      
      if (categoryCount > 0 && data.length > 0) {
        const xStep = this.chartArea.width / (categoryCount > 1 ? categoryCount - 1 : 1);
        
        // 绘制折线
        this.ctx.beginPath();
        this.ctx.setLineWidth(2);
        this.ctx.setStrokeStyle(color);

        // 处理多值数据，如血压
        const isMultiValue = typeof data[0] === 'object';
        const keys = isMultiValue ? Object.keys(data[0]) : ['default'];
        
        keys.forEach((key, keyIndex) => {
          // 给多值数据的不同线条使用不同的颜色
          if (isMultiValue) {
            const keyColor = this.colors[(seriesIndex + keyIndex) % this.colors.length];
            this.ctx.beginPath();
            this.ctx.setStrokeStyle(keyColor);
          }
          
          data.forEach((value, index) => {
            const dataValue = isMultiValue ? value[key] : value;
            const x = this.chartArea.left + index * xStep;
            const y = this.chartArea.top + this.chartArea.height - 
                      ((dataValue - this.yMin) / (this.yMax - this.yMin)) * this.chartArea.height;
            
            if (index === 0) {
              this.ctx.moveTo(x, y);
            } else {
              this.ctx.lineTo(x, y);
            }
          });
          
          this.ctx.stroke();
          
          // 绘制数据点
          data.forEach((value, index) => {
            const dataValue = isMultiValue ? value[key] : value;
            const x = this.chartArea.left + index * xStep;
            const y = this.chartArea.top + this.chartArea.height - 
                      ((dataValue - this.yMin) / (this.yMax - this.yMin)) * this.chartArea.height;
            
            this.ctx.beginPath();
            this.ctx.setFillStyle(isMultiValue ? this.colors[(seriesIndex + keyIndex) % this.colors.length] : color);
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
          });
          
          // 为多值数据绘制图例标签
          if (isMultiValue && series.name && series.names && series.names[key]) {
            const legendX = this.width - this.padding - 10;
            const legendY = this.padding + 15 * (keyIndex + 1);
            const keyColor = this.colors[(seriesIndex + keyIndex) % this.colors.length];
            
            // 绘制图例色块
            this.ctx.beginPath();
            this.ctx.setFillStyle(keyColor);
            this.ctx.rect(legendX - 40, legendY - 8, 8, 8);
            this.ctx.fill();
            
            // 绘制图例文字
            this.ctx.setFontSize(10);
            this.ctx.setFillStyle('#333333');
            this.ctx.setTextAlign('right');
            this.ctx.fillText(series.names[key], legendX, legendY);
          }
        });
        
        // 为单值数据绘制图例
        if (!isMultiValue && series.name) {
          const legendX = this.width - this.padding - 10;
          const legendY = this.padding + 15 * (seriesIndex + 1);
          
          // 绘制图例色块
          this.ctx.beginPath();
          this.ctx.setFillStyle(color);
          this.ctx.rect(legendX - 40, legendY - 8, 8, 8);
          this.ctx.fill();
          
          // 绘制图例文字
          this.ctx.setFontSize(10);
          this.ctx.setFillStyle('#333333');
          this.ctx.setTextAlign('right');
          this.ctx.fillText(series.name, legendX, legendY);
        }
      }
    });
  }

  // 绘制柱状图
  _drawColumnChart() {
    const categoryCount = this.categories.length;
    if (categoryCount > 0) {
      const columnWidth = this.chartArea.width / (categoryCount * 2);
      
      this.series.forEach((series, seriesIndex) => {
        const color = this.colors[seriesIndex % this.colors.length];
        const data = series.data;
        
        if (data.length > 0) {
          data.forEach((value, index) => {
            // 处理单值数据
            if (typeof value !== 'object') {
              const x = this.chartArea.left + index * (this.chartArea.width / categoryCount) + 
                        (this.chartArea.width / categoryCount / 2) - (columnWidth / 2);
              const height = ((value - this.yMin) / (this.yMax - this.yMin)) * this.chartArea.height;
              const y = this.chartArea.top + this.chartArea.height - height;
              
              this.ctx.beginPath();
              this.ctx.setFillStyle(color);
              this.ctx.rect(x, y, columnWidth, height);
              this.ctx.fill();
            } 
            // 处理多值数据，如血压
            else {
              const keys = Object.keys(value);
              keys.forEach((key, keyIndex) => {
                const dataValue = value[key];
                const keyColor = this.colors[(seriesIndex + keyIndex) % this.colors.length];
                const columnWidthMulti = columnWidth / (keys.length || 1); // 每个值的柱宽度
                
                const xBase = this.chartArea.left + index * (this.chartArea.width / categoryCount) + 
                           (this.chartArea.width / categoryCount / 2) - (columnWidth / 2);
                const x = xBase + keyIndex * columnWidthMulti;
                const height = ((dataValue - this.yMin) / (this.yMax - this.yMin)) * this.chartArea.height;
                const y = this.chartArea.top + this.chartArea.height - height;
                
                this.ctx.beginPath();
                this.ctx.setFillStyle(keyColor);
                this.ctx.rect(x, y, columnWidthMulti, height);
                this.ctx.fill();
                
                // 为多值数据绘制图例
                if (series.name && series.names && series.names[key]) {
                  const legendX = this.width - this.padding - 10;
                  const legendY = this.padding + 15 * (keyIndex + 1);
                  
                  // 绘制图例色块
                  this.ctx.beginPath();
                  this.ctx.setFillStyle(keyColor);
                  this.ctx.rect(legendX - 40, legendY - 8, 8, 8);
                  this.ctx.fill();
                  
                  // 绘制图例文字
                  this.ctx.setFontSize(10);
                  this.ctx.setFillStyle('#333333');
                  this.ctx.setTextAlign('right');
                  this.ctx.fillText(series.names[key], legendX, legendY);
                }
              });
            }
          });
          
          // 为单值数据绘制图例
          if (typeof series.data[0] !== 'object' && series.name) {
            const legendX = this.width - this.padding - 10;
            const legendY = this.padding + 15 * (seriesIndex + 1);
            
            // 绘制图例色块
            this.ctx.beginPath();
            this.ctx.setFillStyle(color);
            this.ctx.rect(legendX - 40, legendY - 8, 8, 8);
            this.ctx.fill();
            
            // 绘制图例文字
            this.ctx.setFontSize(10);
            this.ctx.setFillStyle('#333333');
            this.ctx.setTextAlign('right');
            this.ctx.fillText(series.name, legendX, legendY);
          }
        }
      });
    }
  }
}

module.exports = {
  WxChart
}; 