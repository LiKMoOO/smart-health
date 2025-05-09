// projects/A00/health/metrics/health_metrics.js
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const timeHelper = require('../../../../helper/time_helper.js');
const MAX_RECORDS_PER_PAGE = 15; // 每页记录数

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		indicatorList: [],  // 指标记录列表
		
		// 指标类型
		metricTypes: [
			{ id: 'blood_pressure', name: '血压', unit: 'mmHg', hasMultipleValues: true, fields: [{ name: 'systolic', label: '收缩压', placeholder: '请输入收缩压' }, { name: 'diastolic', label: '舒张压', placeholder: '请输入舒张压' }] },
			{ id: 'blood_sugar', name: '血糖', unit: 'mmol/L', hasMultipleValues: false, placeholder: '请输入血糖值' },
			{ id: 'weight', name: '体重', unit: 'kg', hasMultipleValues: false, placeholder: '请输入体重值' },
			{ id: 'heart_rate', name: '心率', unit: 'bpm', hasMultipleValues: false, placeholder: '请输入心率值' },
			// { id: 'temperature', name: '体温', unit: '°C', hasMultipleValues: false, placeholder: '请输入体温值' }
		],
		
		// 当前选中的指标类型
		activeTypeIndex: 0,
		
		// 新记录表单
		showAddModal: false,
		formMetric: {
			type: '',
			value: {},
			unit: '',
			recordTime: '',
			notes: ''
		},
		
		// 是否为编辑模式
		isEdit: false,
		editRecordId: null,
		
		// 详情弹窗
		showDetailModal: false,
		currentDetail: null,
		
		// 筛选相关
		showFilterModal: false,
		filter: {
			startDate: '',
			endDate: '',
		},
		
		// 图表相关
		showChart: false,
		// chartData: [] // 暂时不用
		
		// 分页相关
		_page: 1,
		_total: 0,
		_canLoadMore: true,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad(options) {
		this._resetFormMetric(); // 初始化表单涉及的指标类型
		this.setData({
			'formMetric.recordTime': this._formatDate(new Date()) // 默认记录时间为今天
		});
		this._loadData(true); // 首次加载
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
		this._loadData(true);
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom() {
		if (this.data._canLoadMore) {
			this._loadData();
		}
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
	async _loadData(isRefresh = false) {
		console.log('[health_metrics.js] _loadData called. isRefresh:', isRefresh, 'Current page:', this.data._page, 'Can load more:', this.data._canLoadMore);

		if (!this.data._canLoadMore && !isRefresh) {
			console.log('[health_metrics.js] Cannot load more and not a refresh. Returning.');
			wx.stopPullDownRefresh(); // 确保停止下拉刷新动画
			return;
		}

		try {
			const page = isRefresh ? 1 : this.data._page;
			console.log('[health_metrics.js] Effective page to load:', page);

			if (isRefresh) {
				console.log('[health_metrics.js] Refreshing data, resetting indicatorList and _total.');
				this.setData({ indicatorList: [], _total: 0 });
			}
			// 初始设置 isLoad 为 false 以显示加载动画，_canLoadMore 设为 true 允许加载
			this.setData({ isLoad: false, _canLoadMore: true }); 
			console.log('[health_metrics.js] Set isLoad to false to show loading.');

			const currentType = this.data.metricTypes[this.data.activeTypeIndex];
			let params = {
				type: currentType.id,
				page: page,
				size: MAX_RECORDS_PER_PAGE,
			};

			if (this.data.filter.startDate) params.startTime = new Date(this.data.filter.startDate + " 00:00:00").getTime();
			if (this.data.filter.endDate) params.endTime = new Date(this.data.filter.endDate + " 23:59:59").getTime();
			console.log('[health_metrics.js] Request params:', params);

			const result = await cloudHelper.callCloudData('health/gethealthmetrics', params);
			console.log('[health_metrics.js] Cloud function result:', result);

			if (result && Array.isArray(result.list)) {
				const formattedList = result.list.map(item => ({
					...item,
					formattedDate: item.recordTime ? this._formatDate(new Date(item.recordTime)) : 'N/A',
					formattedTime: item.recordTime ? this._formatTime(new Date(item.recordTime)) : 'N/A',
				}));
				console.log('[health_metrics.js] Formatted list count:', formattedList.length, 'Total from cloud:', result.total);
				
				const newList = isRefresh ? formattedList : [...this.data.indicatorList, ...formattedList];
				const newTotal = result.total || 0;
				const newPage = page + 1;
				// _canLoadMore: 新列表长度等于每页数量 并且 (当前加载的页数 * 每页数量 < 总数)
				const canLoadMore = formattedList.length === MAX_RECORDS_PER_PAGE && (page * MAX_RECORDS_PER_PAGE < newTotal);

				console.log('[health_metrics.js] New list length:', newList.length, 'New total:', newTotal, 'Next page:', newPage, 'Can load more (next):', canLoadMore);

				this.setData({
					indicatorList: newList,
					_total: newTotal,
					_page: newPage,
					_canLoadMore: canLoadMore,
					// isLoad: true, // 将 isLoad 的设置移到 finally 块
				});
			} else {
				console.warn('[health_metrics.js] Cloud function result.list is not an array or result is null.');
				// 如果云函数返回的不是预期格式，也应该能处理，比如认为没有更多数据了
				this.setData({
					_canLoadMore: false,
					// isLoad: true,
				});
			}
		} catch (error) {
			console.error('[health_metrics.js] 获取健康指标数据失败', error);
			this.setData({ _canLoadMore: false /*, isLoad: true*/ }); // 出错也认为加载结束
			pageHelper.showNoneToast('获取数据失败，请重试');
		} finally {
			console.log('[health_metrics.js] Finally block. Setting isLoad to true.');
			this.setData({ isLoad: true }); // 确保 isLoad 在加载流程结束后（无论成功失败）都设为 true
			wx.stopPullDownRefresh();
			console.log('[health_metrics.js] Current indicatorList length after load:', this.data.indicatorList.length, 'isLoad state:', this.data.isLoad);
		}
	},
	
	/**
	 * 切换指标类型
	 */
	onChangeType(e) {
		const index = parseInt(e.currentTarget.dataset.index, 10);
		this.setData({
			activeTypeIndex: index,
			_page: 1, // 重置分页
			_canLoadMore: true,
		});
		this._resetFormMetric(); // 根据新类型重置表单中 type, unit, value结构
		this._loadData(true); // 重新加载数据
	},
	
	/**
	 * 显示添加记录弹窗
	 */
	showAddMetricModal() {
		console.log('[DEBUG] showAddMetricModal called!');
		try {
			// 重置表单数据
			this._resetFormMetric(); // 确保表单基于当前激活的类型
			
			// 设置默认日期为今天
			const today = this._formatDate(new Date());
			console.log('[DEBUG] 默认日期:', today);
			
			// 更新页面状态，显示模态框
			this.setData({
				'formMetric.recordTime': today,
				'formMetric.notes': '', // 清空备注
				showAddModal: true
			});
			
			console.log('[DEBUG] showAddModal设置完成, 当前值:', this.data.showAddModal);
		} catch (e) {
			console.error('[DEBUG] Error in showAddMetricModal:', e);
		}
	},
	
	/**
	 * 隐藏添加记录弹窗
	 */
	hideAddMetricModal() {
		this.setData({
			showAddModal: false,
			isEdit: false,
			editRecordId: null
		});
	},
	
	/**
	 * 处理指标值输入
	 */
	onMetricInput(e) {
		const field = e.currentTarget.dataset.field;
		const value = e.detail.value;
		const currentType = this.data.metricTypes[this.data.activeTypeIndex];

		if (field === 'notes') {
			this.setData({ 'formMetric.notes': value });
		} else if (currentType.hasMultipleValues) {
			// field 会是 'systolic' 或 'diastolic'
			this.setData({ [`formMetric.value.${field}`]: value });
		} else {
			// field 是 'value'
			this.setData({ 'formMetric.value': value });
		}
	},
	
	/**
	 * 处理日期选择
	 */
	onDateChange(e) {
		this.setData({
			'formMetric.recordTime': e.detail.value
		});
	},
	
	/**
	 * 查看详情
	 */
	viewDetail(e) {
		const index = e.currentTarget.dataset.index;
		const record = this.data.indicatorList[index];
		if (record) {
			this.setData({
				currentDetail: record,
				showDetailModal: true
			});
			console.log('[DEBUG] 查看记录详情:', record);
		}
	},
	
	/**
	 * 隐藏详情弹窗
	 */
	hideDetailModal() {
		this.setData({
			showDetailModal: false,
			currentDetail: null
		});
	},
	
	/**
	 * 编辑记录
	 */
	editRecord(e) {
		console.log('[DEBUG] 编辑记录按钮点击');
		const recordId = e.currentTarget.dataset.id;
		if (!recordId) return;
		
		const record = this.data.currentDetail;
		if (!record) return;
		
		// 在指标类型中查找当前记录的类型
		const typeIndex = this.data.metricTypes.findIndex(item => item.id === record.type);
		if (typeIndex === -1) {
			console.error('[DEBUG] 找不到对应的指标类型:', record.type);
			pageHelper.showModal('无法编辑该记录，找不到对应的指标类型');
			return;
		}
		
		// 如果需要切换指标类型
		if (typeIndex !== this.data.activeTypeIndex) {
			this.setData({
				activeTypeIndex: typeIndex
			});
			this._resetFormMetric();
		}
		
		// 设置表单数据
		let formMetricValue = {};
		if (this.data.metricTypes[typeIndex].hasMultipleValues) {
			formMetricValue = {
				systolic: record.value.systolic.toString(),
				diastolic: record.value.diastolic.toString()
			};
		} else {
			formMetricValue = record.value.toString();
		}
		
		// 设置编辑模式
		this.setData({
			isEdit: true,
			editRecordId: recordId,
			'formMetric.value': formMetricValue,
			'formMetric.recordTime': this._formatDate(new Date(record.recordTime)),
			'formMetric.notes': record.notes || '',
			showAddModal: true,
			showDetailModal: false
		});
		
		console.log('[DEBUG] 编辑模式表单数据:', this.data.formMetric);
	},
	
	/**
	 * 提交指标记录
	 */
	async submitMetric() {
		console.log('[DEBUG] submitMetric called!');
		try {
			const { formMetric, metricTypes, activeTypeIndex, isEdit, editRecordId } = this.data;
			const currentMetricType = metricTypes[activeTypeIndex];
			console.log('[DEBUG] 当前指标类型:', currentMetricType.name);
			console.log('[DEBUG] 表单数据:', formMetric);
			console.log('[DEBUG] 是否编辑模式:', isEdit, '记录ID:', editRecordId);
			
			// 构建保存数据
			let metricToSave = {
				type: currentMetricType.id,
				unit: currentMetricType.unit,
				notes: formMetric.notes ? formMetric.notes.trim() : '',
				recordTime: new Date(formMetric.recordTime + " 12:00:00").getTime(), // 默认当天中午12点
				value: null
			};
			
			// 如果是编辑模式，添加ID
			if (isEdit && editRecordId) {
				metricToSave._id = editRecordId;
			}

			// 数据校验和赋值
			if (currentMetricType.hasMultipleValues) {
				// 血压等多值指标
				const systolic = parseFloat(formMetric.value.systolic);
				const diastolic = parseFloat(formMetric.value.diastolic);
				
				if (isNaN(systolic) || systolic <= 0) {
					pageHelper.showModal('请输入有效的收缩压');
					return;
				}
				if (isNaN(diastolic) || diastolic <= 0) {
					pageHelper.showModal('请输入有效的舒张压');
					return;
				}
				if (systolic <= diastolic) {
					pageHelper.showModal('收缩压应大于舒张压');
					return;
				}
				
				metricToSave.value = { systolic, diastolic };
				console.log('[DEBUG] 多值指标数据:', metricToSave.value);
			} else {
				// 单值指标
				const singleValue = parseFloat(formMetric.value);
				if (isNaN(singleValue) || singleValue < 0) {
					pageHelper.showModal('请输入有效的' + currentMetricType.name + '值');
					return;
				}
				
				// 针对不同类型指标的数值范围校验
				if (currentMetricType.id === 'blood_sugar' && singleValue > 30) {
					pageHelper.showModal('血糖值似乎过高，请确认后重新输入');
					return;
				} else if (currentMetricType.id === 'weight' && singleValue > 300) {
					pageHelper.showModal('体重值似乎过高，请确认后重新输入');
					return;
				} else if (currentMetricType.id === 'heart_rate' && singleValue > 220) {
					pageHelper.showModal('心率值似乎过高，请确认后重新输入');
					return;
				}
				
				metricToSave.value = singleValue;
				console.log('[DEBUG] 单值指标数据:', metricToSave.value);
			}

			// 显示加载中
			pageHelper.showLoading(isEdit ? '更新中...' : '保存中...');
			
			// 调用云函数保存数据
			console.log('[DEBUG] 准备提交数据:', {dataType: 'metrics', data: metricToSave});
			const result = await cloudHelper.callCloudData('health/updatehealthdata', {
				dataType: 'metrics',
				data: metricToSave
			});
			
			console.log('[DEBUG] 提交结果:', result);
			
			// 显示成功提示
			pageHelper.showSuccToast(isEdit ? '记录更新成功' : '记录添加成功');
			
			// 关闭模态框并重置编辑状态
			this.hideAddMetricModal();
			
			// 刷新列表数据
			this._loadData(true);
			
			// 如果有异常值，显示健康提醒
			if (result && result.data && result.data.isAbnormal && result.data.abnormalReason) {
				setTimeout(() => {
					pageHelper.showModal('健康提醒：' + result.data.abnormalReason, '记录提示');
				}, 1500);
			}

		} catch (err) {
			console.error('[DEBUG] 添加健康指标失败:', err);
			pageHelper.showModal('操作失败，请重试: ' + (err.message || err));
		} finally {
			pageHelper.hideLoading();
		}
	},
	
	/**
	 * 删除记录
	 */
	async deleteRecord(e) {
		const recordId = e.currentTarget.dataset.id;
		if (!recordId) return;

		wx.showModal({
			title: '确认删除',
			content: '确定要删除这条记录吗？',
			success: async (res) => {
				if (res.confirm) {
					try {
						pageHelper.showLoading('删除中...');
						// 调用实际的云函数接口
						const result = await cloudHelper.callCloudData('health/deletehealthmetric', { recordId: recordId }); 
						
						if (result && result.code === 0) { // 假设云函数返回 code: 0 表示成功
							pageHelper.showSuccToast('删除成功');
							this.hideDetailModal(); // 关闭详情弹窗
							this._loadData(true); // 刷新列表
						} else {
							pageHelper.showModal(result.msg || '删除失败，请稍后重试');
						}

					} catch (err) {
						console.error('删除记录失败', err);
						pageHelper.showModal('删除操作失败，请检查网络或稍后重试');
					} finally {
						pageHelper.hideLoading();
					}
				}
			}
		});
	},
	
	/**
	 * 显示筛选弹窗
	 */
	showFilterModalTap() {
		console.log('[DEBUG] showFilterModalTap called!');
		try {
			this.setData({
				showFilterModal: true
			});
			console.log('[DEBUG] showFilterModal set to true:', this.data.showFilterModal);
		} catch (e) {
			console.error('[DEBUG] Error in showFilterModalTap:', e);
		}
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
		this.setData({
			[`filter.${field}`]: e.detail.value
		});
	},
	
	/**
	 * 应用筛选
	 */
	applyFilter() {
		this.hideFilterModal();
		this.setData({_page: 1}); // 重置分页
		this._loadData(true);
	},
	
	/**
	 * 切换图表/列表视图
	 */
	toggleChart() {
		console.log('[DEBUG] toggleChart called!');
		try {
			const newShowChart = !this.data.showChart;
			this.setData({
				showChart: newShowChart
			});
			console.log('[DEBUG] showChart set to:', newShowChart);
		} catch (e) {
			console.error('[DEBUG] Error in toggleChart:', e);
		}
	},
	
	/**
	 * 重置表单相关的指标类型信息
	 */
	_resetFormMetric() {
		const currentType = this.data.metricTypes[this.data.activeTypeIndex];
		let formValue = {};
		if (currentType.hasMultipleValues) {
			currentType.fields.forEach(f => formValue[f.name] = '');
		} else {
			formValue = ''; // 单值直接为空字符串或 null
		}
		this.setData({
			'formMetric.type': currentType.id,
			'formMetric.unit': currentType.unit,
			'formMetric.value': formValue,
		});
	},
	
	/**
	 * 格式化日期 YYYY-MM-DD
	 */
	_formatDate(date) {
		return timeHelper.timestamp2Time(date.getTime(), 'Y-M-D');
	},
	
	/**
	 * 格式化时间 HH:MM
	 */
	_formatTime(date) {
		return timeHelper.timestamp2Time(date.getTime(), 'h:m');
	},

	// 全局测试点击
	testTap: function() {
		console.log('全局点击测试 - 成功触发!');
		wx.showToast({
			title: '点击成功!',
			icon: 'none'
		});
	},

	// 添加记录直接函数
	addRecord: function() {
		console.log('[DEBUG] addRecord 按钮被点击!');
		wx.showToast({
			title: '添加记录!',
			icon: 'none',
			duration: 1000
		});
		
		// 确保模态框显示
		setTimeout(() => {
			this.showAddMetricModal();
		}, 500);
	},

	// 筛选直接函数
	filterRecord: function() {
		console.log('筛选按钮被点击!');
		wx.showToast({
			title: '筛选!',
			icon: 'none'
		});
		this.showFilterModalTap();
	},

	// 图表直接函数
	chartToggle: function() {
		console.log('图表按钮被点击!');
		wx.showToast({
			title: '切换图表!',
			icon: 'none'
		});
		this.toggleChart();
	},
})