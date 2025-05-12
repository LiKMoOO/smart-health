// projects/A00/health/analysis/health_analysis.js
const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');
const timeHelper = require('../../../../helper/time_helper.js');
const chartHelper = require('../../../../helper/chart_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoading: true,
		
		// 健康分析数据
		healthData: null,
		
		// 周期选择
		periodOptions: [
			{ label: '最近一周', value: 'week' },
			{ label: '最近一月', value: 'month' },
			{ label: '最近一年', value: 'year' }
		],
		currentPeriod: 'month',
		
		// 指标类型
		metricTypes: [
			{ label: '血压', value: 'blood_pressure', selected: true },
			{ label: '血糖', value: 'blood_sugar', selected: true },
			{ label: '体重', value: 'weight', selected: true },
			{ label: '心率', value: 'heart_rate', selected: true }
		],
		
		// 图表数据
		chartSeries: [],
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad(options) {
		this._loadHealthAnalysisData();
	},
	
	/**
	 * 加载健康分析数据
	 */
	async _loadHealthAnalysisData() {
		try {
			this.setData({ isLoading: true });
			
			// 获取所选指标类型
			const selectedTypes = this.data.metricTypes
				.filter(item => item.selected)
				.map(item => item.value);
			
			// 调用云函数
			const params = {
				period: this.data.currentPeriod,
				metricTypes: selectedTypes
			};
			
			const result = await cloudHelper.callCloudData('health/gethealthanalysis', params);
			
			if (result && result.data) {
				// 处理图表数据
				const chartSeries = this._processChartData(result.data.trendData);
				
				this.setData({
					healthData: result.data,
					chartSeries: chartSeries,
					isLoading: false
				});
				
				// 渲染图表
				this._renderCharts();
			}
		} catch (err) {
			console.error('获取健康分析数据失败:', err);
			pageHelper.showNoneToast('获取数据失败，请稍后重试');
			this.setData({ isLoading: false });
		}
	},
	
	/**
	 * 处理图表数据
	 */
	_processChartData(trendData) {
		const series = [];
		
		// 血压数据处理（特殊处理，因为有收缩压和舒张压两个值）
		if (trendData.blood_pressure && trendData.blood_pressure.length > 0) {
			const systolicData = [];
			const diastolicData = [];
			const dates = [];
			
			trendData.blood_pressure.forEach(item => {
				const date = timeHelper.formatDate(new Date(item.recordTime), 'MM-DD');
				dates.push(date);
				
				systolicData.push(item.value.systolic);
				diastolicData.push(item.value.diastolic);
			});
			
			series.push({
				name: '血压',
				categories: dates,
				series: [
					{
						name: '收缩压',
						data: systolicData,
						color: '#F56C6C'
					},
					{
						name: '舒张压',
						data: diastolicData,
						color: '#67C23A'
					}
				]
			});
		}
		
		// 处理其他类型数据
		const metricTypeMap = {
			'blood_sugar': { name: '血糖', color: '#409EFF', unit: 'mmol/L' },
			'weight': { name: '体重', color: '#E6A23C', unit: 'kg' },
			'heart_rate': { name: '心率', color: '#F56C6C', unit: 'bpm' }
		};
		
		Object.keys(trendData).forEach(type => {
			if (type !== 'blood_pressure' && metricTypeMap[type] && trendData[type].length > 0) {
				const data = [];
				const dates = [];
				
				trendData[type].forEach(item => {
					const date = timeHelper.formatDate(new Date(item.recordTime), 'MM-DD');
					dates.push(date);
					data.push(type === 'weight' ? item.value : Number(item.value));
				});
				
				series.push({
					name: metricTypeMap[type].name,
					categories: dates,
					series: [
						{
							name: metricTypeMap[type].name,
							data: data,
							color: metricTypeMap[type].color,
							unit: metricTypeMap[type].unit
						}
					]
				});
			}
		});
		
		return series;
	},
	
	/**
	 * 渲染图表
	 */
	_renderCharts() {
		setTimeout(() => {
			this.data.chartSeries.forEach((chartData, index) => {
				const canvasId = `chart${index}`;
				const canvas = this.selectComponent(`#${canvasId}`);
				
				if (canvas) {
					canvas.init((canvas, width, height, dpr) => {
						const chart = chartHelper.initLineChart({
							canvas: canvas,
							width: width,
							height: height,
							categories: chartData.categories,
							series: chartData.series,
							title: chartData.name
						});
						return chart;
					});
				}
			});
		}, 100);
	},
	
	/**
	 * 切换时间周期
	 */
	onPeriodChange(e) {
		const period = e.currentTarget.dataset.period;
		
		this.setData({
			currentPeriod: period
		}, () => {
			this._loadHealthAnalysisData();
		});
	},
	
	/**
	 * 切换指标类型
	 */
	onMetricChange(e) {
		const index = e.currentTarget.dataset.index;
		const metricTypes = this.data.metricTypes;
		
		metricTypes[index].selected = !metricTypes[index].selected;
		
		this.setData({
			metricTypes: metricTypes
		}, () => {
			this._loadHealthAnalysisData();
		});
	},
	
	/**
	 * 分享健康报告
	 */
	onShareReport() {
		// 实现分享逻辑
		pageHelper.showSuccessToast('分享功能开发中');
	},
	
	/**
	 * 前往记录健康指标
	 */
	onAddHealthMetric() {
		wx.navigateTo({
			url: '../metrics/health_metrics'
		});
	},
	
	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady() {
	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow() {
	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh() {
		this._loadHealthAnalysisData();
		wx.stopPullDownRefresh();
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {
		return {
			title: '我的健康分析报告',
			path: 'projects/A00/health/analysis/health_analysis'
		};
	}
})