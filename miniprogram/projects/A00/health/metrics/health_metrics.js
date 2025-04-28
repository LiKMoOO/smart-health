// projects/A00/health/metrics/health_metrics.js
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const timeHelper = require('../../../../helper/time_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		indicatorList: [],  // 指标记录列表
		
		// 指标类型
		metricTypes: [
			{ id: 'blood_pressure', name: '血压', unit: 'mmHg', hasMultipleValues: true },
			{ id: 'blood_sugar', name: '血糖', unit: 'mmol/L', hasMultipleValues: false },
			{ id: 'weight', name: '体重', unit: 'kg', hasMultipleValues: false },
			{ id: 'heart_rate', name: '心率', unit: 'bpm', hasMultipleValues: false },
			{ id: 'temperature', name: '体温', unit: '°C', hasMultipleValues: false }
		],
		
		// 当前选中的指标类型
		activeTypeIndex: 0,
		
		// 新记录表单
		showAddModal: false,
		formMetric: {
			type: 'blood_pressure',
			value: {},
			unit: 'mmHg',
			recordTime: null,
			notes: ''
		},
		
		// 详情弹窗
		showDetailModal: false,
		currentDetail: null,
		
		// 筛选相关
		showFilterModal: false,
		filter: {
			startDate: '',
			endDate: '',
			type: ''
		},
		
		// 图表相关
		showChart: false,
		chartData: []
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad(options) {
		// 获取当前日期
		const today = new Date();
		const formattedDate = this._formatDate(today);
		
		// 初始化记录时间为当前时间
		let formMetric = this.data.formMetric;
		formMetric.recordTime = formattedDate;
		
		this.setData({
			formMetric
		});
		
		this._loadData();
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
	 * 生命周期函数--监听页面隐藏
	 */
	onHide() {

	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload() {

	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh() {
		this._loadData();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom() {
		// 暂无分页加载
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {
		return {
			title: '健康指标管理',
			path: '/projects/A00/health/metrics/health_metrics'
		}
	},

	/**
	 * 加载健康指标数据
	 */
	async _loadData() {
		try {
			// 设置加载状态
			this.setData({
				isLoad: false
			});
			
			// 获取当前选中的指标类型
			const currentTypeId = this.data.metricTypes[this.data.activeTypeIndex].id;
			
			// 构建查询条件
			let params = {
				type: currentTypeId
			};
			
			// 添加筛选条件
			if (this.data.filter.startDate) {
				params.startTime = new Date(this.data.filter.startDate).getTime();
			}
			
			if (this.data.filter.endDate) {
				// 设置为当天的23:59:59
				const endDate = new Date(this.data.filter.endDate);
				endDate.setHours(23, 59, 59, 999);
				params.endTime = endDate.getTime();
			}
			
			// 调用云函数获取数据
			const result = await cloudHelper.callCloudData('health/gethealthmetrics', params);
			
			// 格式化数据
			let list = result.list.map(item => {
				// 处理日期显示
				const recordDate = new Date(item.recordTime);
				return {
					...item,
					formattedDate: this._formatDate(recordDate),
					formattedTime: this._formatTime(recordDate)
				};
			});
			
			// 更新状态
			this.setData({
				indicatorList: list,
				isLoad: true
			});
			
		} catch (error) {
			console.error('获取健康指标数据失败', error);
			this.setData({
				isLoad: true
			});
			
			pageHelper.showNoneToast('获取数据失败，请重试');
		}
	},
	
	/**
	 * 切换指标类型
	 */
	onChangeType(e) {
		// 获取点击的索引
		const index = e.currentTarget.dataset.index;
		
		// 更新当前选中的类型
		this.setData({
			activeTypeIndex: index
		});
		
		// 重新格式化表单数据
		let formMetric = this.data.formMetric;
		formMetric.type = this.data.metricTypes[index].id;
		formMetric.unit = this.data.metricTypes[index].unit;
		
		// 根据类型不同，初始化不同的值结构
		if (this.data.metricTypes[index].hasMultipleValues) {
			formMetric.value = {
				systolic: '',
				diastolic: ''
			};
		} else {
			formMetric.value = '';
		}
		
		this.setData({
			formMetric
		});
		
		// 重新加载数据
		this._loadData();
	},
	
	/**
	 * 显示添加记录弹窗
	 */
	showAddMetricModal() {
		// 重置表单数据
		const type = this.data.metricTypes[this.data.activeTypeIndex];
		let formMetric = {
			type: type.id,
			unit: type.unit,
			recordTime: this._formatDate(new Date()),
			notes: ''
		};
		
		// 根据类型不同，初始化不同的值结构
		if (type.hasMultipleValues) {
			formMetric.value = {
				systolic: '',
				diastolic: ''
			};
		} else {
			formMetric.value = '';
		}
		
		this.setData({
			formMetric,
			showAddModal: true
		});
	},
	
	/**
	 * 隐藏添加记录弹窗
	 */
	hideAddMetricModal() {
		this.setData({
			showAddModal: false
		});
	},
	
	/**
	 * 处理指标值输入
	 */
	onMetricInput(e) {
		const field = e.currentTarget.dataset.field;
		const value = e.detail.value;
		
		let formMetric = this.data.formMetric;
		
		// 根据字段类型不同进行处理
		if (field === 'systolic' || field === 'diastolic') {
			// 血压等多值情况
			formMetric.value[field] = value;
		} else if (field === 'value') {
			// 单值情况
			formMetric.value = value;
		} else {
			// 其他字段
			formMetric[field] = value;
		}
		
		this.setData({
			formMetric
		});
	},
	
	/**
	 * 处理日期选择
	 */
	onDateChange(e) {
		const date = e.detail.value;
		
		let formMetric = this.data.formMetric;
		formMetric.recordTime = date;
		
		this.setData({
			formMetric
		});
	},
	
	/**
	 * 提交指标记录
	 */
	async submitMetric() {
		// 获取表单数据
		const formMetric = this.data.formMetric;
		const type = this.data.metricTypes[this.data.activeTypeIndex];
		
		// 验证数据
		if (type.hasMultipleValues) {
			// 多值验证
			if (!formMetric.value.systolic) {
				return pageHelper.showModal('请输入收缩压值');
			}
			if (!formMetric.value.diastolic) {
				return pageHelper.showModal('请输入舒张压值');
			}
		} else {
			// 单值验证
			if (!formMetric.value) {
				return pageHelper.showModal(`请输入${type.name}值`);
			}
		}
		
		// 验证日期
		if (!formMetric.recordTime) {
			return pageHelper.showModal('请选择测量日期');
		}
		
		try {
			pageHelper.showLoading('提交中...');
			
			// 准备提交的数据
			const params = {
				type: formMetric.type,
				value: formMetric.value,
				unit: formMetric.unit,
				notes: formMetric.notes,
				recordTimestamp: new Date(formMetric.recordTime).getTime()
			};
			
			// 调用云函数
			await cloudHelper.callCloudData('health/addhealthmetrics', params);
			
			// 隐藏弹窗
			this.setData({
				showAddModal: false
			});
			
			// 重新加载数据
			this._loadData();
			
			pageHelper.showSuccToast('添加成功');
		} catch (error) {
			console.error('添加健康指标记录失败', error);
			pageHelper.showModal('添加失败，请重试');
		} finally {
			pageHelper.hideLoading();
		}
	},
	
	/**
	 * 查看详情
	 */
	viewDetail(e) {
		const index = e.currentTarget.dataset.index;
		const detail = this.data.indicatorList[index];
		
		this.setData({
			currentDetail: detail,
			showDetailModal: true
		});
	},
	
	/**
	 * 隐藏详情弹窗
	 */
	hideDetailModal() {
		this.setData({
			showDetailModal: false
		});
	},
	
	/**
	 * 删除记录
	 */
	async deleteRecord(e) {
		const id = e.currentTarget.dataset.id;
		
		// 确认删除
		const confirm = await pageHelper.showConfirm('确定要删除此记录吗？');
		if (!confirm) return;
		
		try {
			pageHelper.showLoading('删除中...');
			
			// 调用云函数删除
			await cloudHelper.callCloudData('health/deletehealthmetric', { id });
			
			// 隐藏弹窗
			this.setData({
				showDetailModal: false
			});
			
			// 重新加载数据
			this._loadData();
			
			pageHelper.showSuccToast('删除成功');
		} catch (error) {
			console.error('删除健康指标记录失败', error);
			pageHelper.showModal('删除失败，请重试');
		} finally {
			pageHelper.hideLoading();
		}
	},
	
	/**
	 * 显示筛选弹窗
	 */
	showFilterModalTap() {
		this.setData({
			showFilterModal: true
		});
	},
	
	/**
	 * 隐藏筛选弹窗
	 */
	hideFilterModal() {
		this.setData({
			showFilterModal: false
		});
	},
	
	/**
	 * 处理筛选条件变化
	 */
	onFilterInput(e) {
		const field = e.currentTarget.dataset.field;
		const value = e.detail.value;
		
		let filter = this.data.filter;
		filter[field] = value;
		
		this.setData({
			filter
		});
	},
	
	/**
	 * 应用筛选
	 */
	applyFilter() {
		// 隐藏筛选弹窗
		this.setData({
			showFilterModal: false
		});
		
		// 重新加载数据
		this._loadData();
	},
	
	/**
	 * 切换图表/列表视图
	 */
	toggleChart() {
		const showChart = !this.data.showChart;
		
		this.setData({
			showChart
		});
		
		// 如果切换到图表视图，可以在这里准备图表数据
		if (showChart) {
			// TODO: 准备图表数据
		}
	},
	
	/**
	 * 格式化日期 YYYY-MM-DD
	 */
	_formatDate(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		
		return `${year}-${month}-${day}`;
	},
	
	/**
	 * 格式化时间 HH:MM
	 */
	_formatTime(date) {
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		
		return `${hours}:${minutes}`;
	}
})