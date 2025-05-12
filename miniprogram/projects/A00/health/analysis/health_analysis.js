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
		
		// 周期选项
		periodOptions: [
			{ label: '最近一周', value: 'week' },
			{ label: '最近一月', value: 'month' },
			{ label: '最近一年', value: 'year' }
		],
		currentPeriod: 'month', // 默认一个月
		
		// 指标类型
		metricTypes: [
			{ label: '血压', value: 'blood_pressure', selected: true },
			{ label: '血糖', value: 'blood_sugar', selected: true },
			{ label: '体重', value: 'weight', selected: true },
			{ label: '心率', value: 'heart_rate', selected: true }
		],
		
		// 图表数据
		chartSeries: [],
		
		// 图表ec配置映射
		ecMap: {}
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		console.log('[health_analysis] 页面加载开始...');
		await this._loadHealthAnalysisData();
	},
	
	/**
	 * 加载健康分析数据
	 */
	async _loadHealthAnalysisData() {
		try {
			// 显示加载中
			this.setData({ isLoading: true });
			
			// 获取选中的健康指标 value 数组
			const selectedMetrics = this.data.metricTypes
				.filter(item => item.selected)
				.map(item => item.value);
			
			console.log('[health_analysis] 正在获取健康分析数据...', {
				period: this.data.currentPeriod,
				metrics: selectedMetrics
			});
			
			// 调用云函数获取健康数据分析 (cloudHelper.callCloudData 成功时会返回解包后的 data 部分)
			const cloudResult = await cloudHelper.callCloudData('health/gethealthanalysis', {
				period: this.data.currentPeriod,
				metrics: selectedMetrics
			});
			
			console.log('[health_analysis] cloudHelper.callCloudData 返回结果:', JSON.stringify(cloudResult));
			
			// 检查 cloudHelper 是否返回了有效数据
			if (!cloudResult) {
				throw new Error('获取数据失败或无数据');
			}
			
			// 直接从 cloudResult (即原始的 data 部分) 中提取数据
			const trendData = cloudResult.trendData || {};
			const healthAssessment = cloudResult.healthAssessment || {};
			
			console.log('[health_analysis] 用于处理的趋势数据:', trendData);
			const chartSeries = this._processChartData(trendData);
			console.log('[health_analysis] 图表数据处理完成:', chartSeries);
			
			console.log('[health_analysis] 准备设置页面数据并停止加载...');
			
			// 更新页面数据
			this.setData({
				healthData: {
					trendData,
					healthAssessment,
					period: this.data.currentPeriod // 保持当前选择的周期
				},
				chartSeries: chartSeries,
				isLoading: false
			}, () => {
				console.log('[health_analysis] 页面数据设置完成, isLoading:', this.data.isLoading);
				
				// 初始化并渲染图表
				console.log('[health_analysis] 开始渲染图表...');
				this._renderCharts();
				console.log('[health_analysis] 图表渲染调用完成.');
			});
		} catch (err) {
			console.error('[health_analysis] 获取健康分析数据失败:', err);
			this.setData({ 
				isLoading: false,
				chartSeries: []
			});
			pageHelper.showNoneToast('获取数据失败: ' + err.message);
		}
	},
	
	/**
	 * 处理图表数据
	 * @param {Object} trendData 从云函数返回的趋势数据
	 */
	_processChartData(trendData) {
		console.log('[health_analysis] 开始处理图表数据:', trendData);
		
		if (!trendData) {
			console.warn('[health_analysis] 图表数据为空');
			return [];
		}
		
		const chartSeries = [];
		
		// 处理血压数据（特殊处理，因为有收缩压和舒张压两个值）
		if (trendData.blood_pressure && trendData.blood_pressure.length > 0) {
			try {
				const systolicData = [];
				const diastolicData = [];
				const dates = [];
				
				trendData.blood_pressure.forEach(item => {
					if (!item.recordTime || !item.value) return;
					
					const date = timeHelper.timestamp2Time(item.recordTime, 'MM-DD');
					dates.push(date);
					
					if (item.value.systolic && item.value.diastolic) {
						systolicData.push(Number(item.value.systolic));
						diastolicData.push(Number(item.value.diastolic));
					}
				});
				
				if (dates.length > 0) {
					chartSeries.push({
						name: '血压',
						categories: dates,
						series: [
							{
								name: '收缩压',
								data: systolicData,
								color: '#F56C6C',
								unit: 'mmHg'
							},
							{
								name: '舒张压',
								data: diastolicData,
								color: '#409EFF',
								unit: 'mmHg'
							}
						]
					});
				}
			} catch (e) {
				console.error('[health_analysis] 处理血压数据出错:', e);
			}
		}
		
		// 处理其他类型数据
		const metricTypeMap = {
			'blood_sugar': { name: '血糖', color: '#67C23A', unit: 'mmol/L' },
			'weight': { name: '体重', color: '#E6A23C', unit: 'kg' },
			'heart_rate': { name: '心率', color: '#F56C6C', unit: 'bpm' }
		};
		
		Object.keys(trendData).forEach(type => {
			if (type !== 'blood_pressure' && metricTypeMap[type] && trendData[type].length > 0) {
				try {
					const data = [];
					const dates = [];
					
					trendData[type].forEach(item => {
						if (!item.recordTime || item.value === undefined) return;
						
						const date = timeHelper.timestamp2Time(item.recordTime, 'MM-DD');
						dates.push(date);
						const value = type === 'weight' ? Number(item.value) : Number(item.value);
						data.push(isNaN(value) ? 0 : value);
					});
					
					if (dates.length > 0) {
						chartSeries.push({
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
				} catch (e) {
					console.error(`[health_analysis] 处理${type}数据出错:`, e);
				}
			}
		});
		
		console.log('[health_analysis] 处理后的图表数据系列:', chartSeries);
		return chartSeries;
	},
	
	/**
	 * 渲染图表
	 */
	_renderCharts() {
		console.log('[health_analysis] 进入 _renderCharts...');
		// 初始化每个图表的ec对象
		const ecMap = {};
		this.data.chartSeries.forEach((chartData, index) => {
			const canvasId = `chart${index}`;
			ecMap[canvasId] = {
				onInit: (canvas, width, height, dpr) => {
					console.log(`[health_analysis] Canvas #${canvasId} init 回调执行, width:`, width, ", height:", height, ", dpr:", dpr);
					const chart = chartHelper.initLineChart({
						canvas: canvas,
						width: width,
						height: height,
						categories: chartData.categories,
						series: chartData.series,
						title: chartData.name
					});
					console.log(`[health_analysis] 图表 ${canvasId} 初始化调用完成.`);
					return chart;
				}
			};
		});
		
		// 更新ecMap数据
		this.setData({ ecMap: ecMap }, () => {
			console.log('[health_analysis] ecMap数据已更新:', this.data.ecMap);
		});
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