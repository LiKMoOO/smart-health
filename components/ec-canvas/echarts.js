console.log('[echarts.js render] 计算出的 Y 轴范围 (minY, maxY):', minY, maxY);

const padding = {
    top: 30,
    right: 30, 
    bottom: 40, // 增加底部padding以容纳X轴标签
    left: 40 // 增加左侧padding以容纳Y轴标签
};
const chartWidth = canvasWidth - padding.left - padding.right;
const chartHeight = canvasHeight - padding.top - padding.bottom;
console.log('[echarts.js render] 图表绘制区域尺寸 (chartWidth, chartHeight):', chartWidth, chartHeight);

ctx.beginPath();
ctx.moveTo(padding.left, padding.top);
ctx.lineTo(padding.left, canvasHeight - padding.bottom);
ctx.lineTo(canvasWidth - padding.right, canvasHeight - padding.bottom);
ctx.strokeStyle = '#ddd';

if (isFinite(minY) && isFinite(maxY)) {
    const minYLabel = minY.toFixed(1);
    const maxYLabel = maxY.toFixed(1);
    console.log('[echarts.js render] 绘制 Y 轴标签:', minYLabel, maxYLabel);
    // 调整Y轴标签位置
    ctx.fillText(minYLabel, padding.left - ctx.measureText(minYLabel).width - 5, canvasHeight - padding.bottom);
    ctx.fillText(maxYLabel, padding.left - ctx.measureText(maxYLabel).width - 5, padding.top + 10); // 10是字体大小的近似
} else {
    // ... existing code ...
}

if (categories.length > 0) {
    console.log('[echarts.js render] 绘制 X 轴标签:', categories[0], categories[categories.length - 1]);
    // 调整X轴标签位置
    ctx.fillText(categories[0], padding.left, canvasHeight - padding.bottom + 20); // 20是预留给标签的间距
    if (categories.length > 1) {
        ctx.fillText(categories[categories.length - 1], canvasWidth - padding.right - ctx.measureText(categories[categories.length - 1]).width, canvasHeight - padding.bottom + 20);
    }
} else {
    // ... existing code ...
}

// ... existing code ...

if (count > 1) {
    // ... existing code ...
} else {
    // ... existing code ...
}

// ... existing code ...

ctx.beginPath();
// ... existing code ...

ctx.beginPath();
// ... existing code ... 