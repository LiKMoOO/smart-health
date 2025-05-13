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
		ecMap: {},
		
		// AI建议状态
		isRefreshingAI: false
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
				
				// 如果没有AI建议，自动获取
				if (healthAssessment && !healthAssessment.aiSuggestion) {
					console.log('[health_analysis] 正在自动获取AI健康建议...');
					this.refreshAISuggestion();
				}
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
	 * 刷新AI健康建议
	 * 通过AI接口获取健康建议
	 */
	async refreshAISuggestion() {
		if (this.data.isRefreshingAI) return;
		
		try {
			// 显示刷新中状态
			this.setData({ isRefreshingAI: true });
			
			// 准备健康数据
			const healthAssessment = this.data.healthData?.healthAssessment;
			if (!healthAssessment) {
				throw new Error('没有健康评估数据');
			}
			
			// 获取用户健康档案
			const userInfo = await cloudHelper.callCloudData('health/gethealthindex', {});
			const profile = userInfo?.profile?.basicInfo || {};
			
			console.log('[health_analysis] 开始通过API获取AI健康建议');
			
			// 构建健康数据描述
			let healthDescription = `健康评分：${healthAssessment.overallScore || 0}分\n`;
			
			// 添加用户基本信息
			if (profile) {
				healthDescription += `\n基本信息：\n`;
				healthDescription += `- 年龄：${profile.age || '未知'}\n`;
				healthDescription += `- 性别：${profile.gender || '未知'}\n`;
				healthDescription += `- 身高：${profile.height || '未知'} cm\n`;
				healthDescription += `- 体重：${profile.weight || '未知'} kg\n`;
				
				// 计算BMI
				if (profile.height && profile.weight) {
					const bmi = (profile.weight / Math.pow(profile.height/100, 2)).toFixed(1);
					healthDescription += `- BMI：${bmi}\n`;
				}
			}
			
			// 添加健康指标信息
			if (healthAssessment.items && healthAssessment.items.length > 0) {
				healthDescription += `\n健康指标：\n`;
				healthAssessment.items.forEach(item => {
					healthDescription += `- ${item.name}：${item.value || '未知'}，状态：${item.status || '未知'}\n`;
				});
			}
			
			// 使用AI医生相同的API调用模式
			const systemPrompt = `你是一位专业的健康顾问AI助手，基于用户的健康数据提供个性化的健康建议。你的建议应当专业、全面、易于理解，并且针对用户的具体健康状况。请使用礼貌、关心的语气，但不要过度使用敬语。`;
			
			const userPrompt = `请基于以下健康数据，给我提供一份个性化的健康建议:\n\n${healthDescription}\n\n请给出针对我健康状况的具体建议，包括：日常饮食、运动建议、生活习惯调整等方面。请简明扼要，内容控制在300字左右。`;
			
			// 准备聊天消息
			const messages = [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			];
			
			// 调用AI接口
			const result = await cloudHelper.callCloudSumbit('ai/doctor', {
				messages: messages
			});
			
			console.log('[health_analysis] AI接口返回结果:', result);
			
			if (result && result.data && result.data.text) {
				// 更新AI建议
				const healthData = this.data.healthData;
				if (!healthData.healthAssessment) {
					healthData.healthAssessment = {};
				}
				healthData.healthAssessment.aiSuggestion = result.data.text;
				
				this.setData({
					healthData: healthData,
					isRefreshingAI: false
				});
				
				pageHelper.showSuccToast('AI建议更新成功');
			} else {
				throw new Error('获取AI建议失败，未返回有效数据');
			}
		} catch (err) {
			console.error('[health_analysis] 获取AI健康建议失败:', err);
			this.setData({ isRefreshingAI: false });
			pageHelper.showNoneToast('获取失败: ' + (err.message || '未知错误'));
		}
	},
	
	/**
	 * 导航到AI医生页面进行更多咨询
	 */
	navigateToAIDoctor() {
		try {
			// 可以携带当前健康数据作为初始问题
			const healthScore = this.data.healthData?.healthAssessment?.overallScore || 0;
			const initialQuestion = `我的健康评分是${healthScore}分，请给我一些健康建议。`;
			
			// 使用switchTab方法跳转到tabbar页面
			try {
				// 将问题保存到本地存储，因为switchTab不能传递参数
				wx.setStorageSync('AI_DOCTOR_INITIAL_QUESTION', initialQuestion);
				
				wx.switchTab({
					url: '../../ai/index/ai_index',
					fail: (err) => {
						console.error('切换到AI医生tab页面失败:', err);
						// 尝试普通页面跳转
						wx.navigateTo({
							url: '../../ai/doctor/ai_doctor?initialQuestion=' + encodeURIComponent(initialQuestion),
							fail: (navErr) => {
								console.error('导航到AI医生页面也失败:', navErr);
								this._showAIAdviceInDialog(healthScore);
							}
						});
					}
				});
			} catch (error) {
				console.error('尝试跳转AI医生页面出错:', error);
				this._showAIAdviceInDialog(healthScore);
			}
		} catch (err) {
			console.error('navigateToAIDoctor 执行出错:', err);
			pageHelper.showNoneToast('暂时无法咨询AI医生，请稍后再试');
		}
	},
	
	/**
	 * 临时解决方案：在对话框中显示AI建议
	 */
	_showAIAdviceInDialog(healthScore) {
		// 根据健康评分生成不同的AI建议
		let aiAdvice = '';
		if (healthScore >= 90) {
			aiAdvice = `您的健康评分为${healthScore}分，整体健康状况非常好！\n\n建议您：\n1. 继续保持良好的生活习惯\n2. 定期锻炼和均衡饮食\n3. 保持充足的睡眠\n4. 定期进行健康检查\n\n如有任何不适，请及时就医。`;
		} else if (healthScore >= 75) {
			aiAdvice = `您的健康评分为${healthScore}分，整体健康状况良好，但有提升空间。\n\n建议您：\n1. 适当增加有氧运动，每周至少3次\n2. 注意饮食均衡，多摄入蔬果\n3. 保持良好的作息习惯\n4. 减少压力，保持心情愉悦\n\n如有任何不适，请及时就医。`;
		} else if (healthScore >= 60) {
			aiAdvice = `您的健康评分为${healthScore}分，健康状况一般，需要注意改善。\n\n建议您：\n1. 调整生活方式，增加适当运动\n2. 关注饮食健康，减少高油高盐摄入\n3. 规律作息，确保充足睡眠\n4. 定期监测健康指标变化\n\n建议近期进行全面体检，及时了解身体状况。`;
		} else {
			aiAdvice = `您的健康评分为${healthScore}分，健康状况需要重视。\n\n建议您：\n1. 尽快调整不良生活习惯\n2. 严格控制饮食，增加适当锻炼\n3. 保持规律作息，避免熬夜\n4. 尽快就医咨询，获取专业指导\n\n建议尽快进行全面体检，并遵医嘱进行健康管理。`;
		}
		
		// 使用对话框显示AI建议
		wx.showModal({
			title: 'AI医生建议',
			content: aiAdvice,
			showCancel: false,
			confirmText: '我知道了'
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