// projects/A00/health/journal/health_journal.js
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');
const timeHelper = require('../../../../helper/time_helper.js');
const MAX_RECORDS_PER_PAGE = 15; // 每页记录数

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: true, // 初始设置为true，避免加载状态问题
		journalList: [], // 日志记录列表
		
		// 心情选项
		moods: ['良好', '开心', '平静', '疲惫', '焦虑', '沮丧', '愤怒'],
		moodIndex: 0,
		
		// 活动量选项
		activityLevels: ['无', '低', '中等', '高'],
		activityIndex: 0,
		
		// 常见症状选项
		symptomsOptions: ['头痛', '发热', '咳嗽', '疲劳', '腹痛', '胸闷', '头晕', '恶心', '呕吐', '腹泻', '便秘', '关节痛', '肌肉酸痛', '皮疹'],
		selectedSymptoms: {}, // 已选中的症状
		
		// 新日志表单
		showAddModal: false, // 确保初始值为false
		formJournal: {
			date: '',
			mood: '',
			sleepHours: '',
			activityLevel: '',
			symptoms: [],
			notes: ''
		},
		
		// 是否为编辑模式
		isEdit: false,
		editJournalId: null,
		
		// 详情弹窗
		showDetailModal: false,
		currentDetail: null,
		
		// 筛选相关
		showFilterModal: false,
		filter: {
			startDate: '',
			endDate: '',
		},
		
		// 分页相关
		_page: 1,
		_total: 0,
		_canLoadMore: true,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad(options) {
		console.log('[健康日志] 页面加载');
		// 确保所有弹窗状态初始为false
		this._resetAllModals();
		
		this._resetFormJournal(); // 初始化表单
		this._loadData(true); // 首次加载
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady() {
		console.log('[健康日志] 页面渲染完成');
	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow() {
		console.log('[健康日志] 页面显示');
		// 确保每次页面显示时所有弹窗都是关闭的
		this._resetAllModals();
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
			title: '健康日志',
			path: '/projects/A00/health/journal/health_journal'
		}
	},

	/**
	 * 重置所有弹窗状态
	 */
	_resetAllModals() {
		this.setData({
			showAddModal: false,
			showDetailModal: false,
			showFilterModal: false
		});
	},

	/**
	 * 加载健康日志数据
	 */
	async _loadData(isRefresh = false) {
		if (!this.data._canLoadMore && !isRefresh) {
			wx.stopPullDownRefresh(); // 确保停止下拉刷新动画
			return;
		}

		try {
			const page = isRefresh ? 1 : this.data._page;

			if (isRefresh) {
				this.setData({ journalList: [], _total: 0 });
			}
			
			// 初始设置 isLoad 为 false 以显示加载动画，_canLoadMore 设为 true 允许加载
			this.setData({ isLoad: false, _canLoadMore: true }); 

			let params = {
				page: page,
				size: MAX_RECORDS_PER_PAGE,
			};

			if (this.data.filter.startDate) params.startDate = this.data.filter.startDate;
			if (this.data.filter.endDate) params.endDate = this.data.filter.endDate;

			try {
				const result = await cloudHelper.callCloudData('health/gethealthjournal', params);

				if (result && Array.isArray(result.list)) {
					const formattedList = result.list.map(item => {
						// 确保每条记录的日期格式正确
						if (!item.date || item.date.indexOf('57387') >= 0 || !this._isValidDateFormat(item.date)) {
							item.date = this._formatDate(new Date());
						}
						return item;
					});
					
					const newList = isRefresh ? formattedList : [...this.data.journalList, ...formattedList];
					const newTotal = result.total || 0;
					const newPage = page + 1;
					// _canLoadMore: 新列表长度等于每页数量 并且 (当前加载的页数 * 每页数量 < 总数)
					const canLoadMore = formattedList.length === MAX_RECORDS_PER_PAGE && (page * MAX_RECORDS_PER_PAGE < newTotal);

					this.setData({
						journalList: newList,
						_total: newTotal,
						_page: newPage,
						_canLoadMore: canLoadMore,
						isLoad: true,
					});
				} else {
					this.setData({
						_canLoadMore: false,
						isLoad: true,
					});
				}
			} catch (error) {
				console.error('[健康日志] 云函数调用失败:', error);
				// 即使云函数失败，也设置isLoad为true以显示空态
				this.setData({
					isLoad: true,
					_canLoadMore: false,
				});
			}
		} catch (error) {
			console.error('[健康日志] 获取健康日志数据失败', error);
			this.setData({ 
				_canLoadMore: false,
				isLoad: true
			});
			pageHelper.showNoneToast('获取数据失败，请重试');
		} finally {
			wx.stopPullDownRefresh();
		}
	},

	/**
	 * 显示添加日志弹窗 - 使用visibility控制
	 */
	showAddJournalModal() {
		console.log('[健康日志] 尝试显示添加日志弹窗');
		
		// 重置表单并设置编辑状态
		this._resetFormJournal();
		this.setData({
			isEdit: false,
			editJournalId: null,
			showAddModal: true // 直接设置状态以应用.modal-visible类
		});
		console.log('[健康日志] 添加日志弹窗状态设置为:', true);
	},

	/**
	 * 隐藏添加日志弹窗
	 */
	hideAddModal() {
		console.log('[健康日志] 隐藏添加日志弹窗');
		this.setData({
			showAddModal: false
		});
	},

	/**
	 * 处理日志表单输入
	 */
	onJournalInput(e) {
		const { field } = e.currentTarget.dataset;
		const value = e.detail.value;
		this.setData({
			[`formJournal.${field}`]: value
		});
	},

	/**
	 * 处理日期选择
	 */
	onDateChange(e) {
		this.setData({
			'formJournal.date': e.detail.value
		});
	},

	/**
	 * 处理心情选择
	 */
	onMoodChange(e) {
		const moodIndex = e.detail.value;
		this.setData({
			moodIndex: moodIndex,
			'formJournal.mood': this.data.moods[moodIndex]
		});
	},

	/**
	 * 处理活动量选择
	 */
	onActivityChange(e) {
		const activityIndex = e.detail.value;
		this.setData({
			activityIndex: activityIndex,
			'formJournal.activityLevel': this.data.activityLevels[activityIndex]
		});
	},

	/**
	 * 切换症状选择
	 */
	toggleSymptom(e) {
		const symptom = e.currentTarget.dataset.symptom;
		const selectedSymptoms = this.data.selectedSymptoms;
		selectedSymptoms[symptom] = !selectedSymptoms[symptom];
		
		// 更新selectedSymptoms和formJournal.symptoms
		const symptoms = Object.keys(selectedSymptoms).filter(key => selectedSymptoms[key]);
		
		this.setData({
			selectedSymptoms: selectedSymptoms,
			'formJournal.symptoms': symptoms
		});
	},

	/**
	 * 查看日志详情 - 使用visibility控制
	 */
	viewDetail(e) {
		const index = e.currentTarget.dataset.index;
		const currentDetail = JSON.parse(JSON.stringify(this.data.journalList[index]));
		console.log('[健康日志] 尝试显示详情弹窗');
		
		// 确保日期格式正确
		if (!currentDetail.date || currentDetail.date.indexOf('57387') >= 0 || !this._isValidDateFormat(currentDetail.date)) {
			currentDetail.date = this._formatDate(new Date());
		}
		
		// 设置详情数据并显示弹窗
		this.setData({
			currentDetail: currentDetail,
			showDetailModal: true
		});
		console.log('[健康日志] 详情弹窗状态设置为:', true);
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
	 * 编辑日志
	 */
	editJournal(e) {
		const journalId = e.currentTarget.dataset.id;
		const journal = this.data.currentDetail;
		console.log('[健康日志] 尝试编辑日志，打开添加弹窗');
		
		// 确保日期格式正确
		let formattedDate = journal.date;
		// 检查是否是错误格式的日期，如果是则使用今天的日期
		if (!formattedDate || formattedDate.indexOf('57387') >= 0 || !this._isValidDateFormat(formattedDate)) {
			formattedDate = this._formatDate(new Date());
		}
		
		// 根据当前日志设置表单初始值
		const moodIndex = this.data.moods.findIndex(item => item === journal.mood);
		const activityIndex = this.data.activityLevels.findIndex(item => item === journal.activityLevel);
		
		// 设置已选中症状
		const selectedSymptoms = {};
		if (journal.symptoms && journal.symptoms.length > 0) {
			journal.symptoms.forEach(symptom => {
				selectedSymptoms[symptom] = true;
			});
		}
		
		// 先关闭详情弹窗
		this.hideDetailModal();
		
		// 设置编辑状态和表单数据，然后显示添加/编辑弹窗
		this.setData({
			formJournal: {
				date: formattedDate, // 使用验证后的日期
				mood: journal.mood,
				sleepHours: journal.sleepHours,
				activityLevel: journal.activityLevel,
				symptoms: journal.symptoms || [],
				notes: journal.notes || ''
			},
			moodIndex: moodIndex > -1 ? moodIndex : 0,
			activityIndex: activityIndex > -1 ? activityIndex : 0,
			selectedSymptoms: selectedSymptoms,
			isEdit: true,
			editJournalId: journalId,
			showAddModal: true // 直接设置状态
		});
		console.log('[健康日志] 编辑模式，添加日志弹窗状态设置为:', true);
	},

	/**
	 * 提交日志
	 */
	async submitJournal() {
		// 表单验证
		if (!this.data.formJournal.date) {
			pageHelper.showNoneToast('请选择日期');
			return;
		}
		if (!this.data.formJournal.mood) {
			pageHelper.showNoneToast('请选择心情');
			return;
		}
		if (!this.data.formJournal.sleepHours) {
			pageHelper.showNoneToast('请输入睡眠时长');
			return;
		}
		if (!this.data.formJournal.activityLevel) {
			pageHelper.showNoneToast('请选择活动量');
			return;
		}
		
		// 构建数据
		const data = {
			date: this.data.formJournal.date,
			mood: this.data.formJournal.mood,
			sleepHours: parseFloat(this.data.formJournal.sleepHours),
			activityLevel: this.data.formJournal.activityLevel,
			symptoms: this.data.formJournal.symptoms,
			notes: this.data.formJournal.notes
		};
		
		try {
			// 显示提交中
			wx.showLoading({
				title: this.data.isEdit ? '保存中' : '提交中',
				mask: true
			});
			
			let result;
			if (this.data.isEdit) {
				// 编辑模式，更新现有记录
				result = await cloudHelper.callCloud('health/updatehealthdata', {
					dataType: 'journal',
					journalId: this.data.editJournalId,
					data: data
				});
			} else {
				// 新增模式
				result = await cloudHelper.callCloud('health/updatehealthdata', {
					dataType: 'journal',
					data: data
				});
			}
			
			if (result) {
				// 成功提交
				this.setData({
					showAddModal: false
				});
				
				wx.showToast({
					title: this.data.isEdit ? '日志已更新' : '日志已添加',
					icon: 'success'
				});
				
				// 刷新数据
				this._loadData(true);
			}
		} catch (error) {
			console.error('提交健康日志失败', error);
			pageHelper.showNoneToast('提交失败，请重试');
		} finally {
			wx.hideLoading();
		}
	},

	/**
	 * 删除日志
	 */
	async deleteJournal(e) {
		const journalId = e.currentTarget.dataset.id;
		
		// 二次确认
		const confirm = await pageHelper.showConfirm('确定要删除这条日志记录吗？');
		if (!confirm) return;
		
		try {
			wx.showLoading({
				title: '删除中',
				mask: true
			});
			
			const result = await cloudHelper.callCloud('health/updatehealthdata', {
				dataType: 'journal',
				action: 'delete',
				journalId: journalId
			});
			
			if (result) {
				this.setData({
					showDetailModal: false
				});
				
				wx.showToast({
					title: '日志已删除',
					icon: 'success'
				});
				
				// 刷新数据
				this._loadData(true);
			}
		} catch (error) {
			console.error('删除健康日志失败', error);
			pageHelper.showNoneToast('删除失败，请重试');
		} finally {
			wx.hideLoading();
		}
	},

	/**
	 * 显示筛选弹窗 - 使用visibility控制
	 */
	showFilterModal() {
		console.log('[健康日志] 尝试显示筛选弹窗');
		
		// 直接设置状态以应用.modal-visible类
		this.setData({
			showFilterModal: true
		});
		console.log('[健康日志] 筛选弹窗状态设置为:', true);
	},

	/**
	 * 隐藏筛选弹窗
	 */
	hideFilterModal() {
		console.log('[健康日志] 隐藏筛选弹窗');
		this.setData({
			showFilterModal: false
		});
	},

	/**
	 * 处理筛选表单输入
	 */
	onFilterInput(e) {
		const { field } = e.currentTarget.dataset;
		const value = e.detail.value;
		this.setData({
			[`filter.${field}`]: value
		});
	},

	/**
	 * 应用筛选
	 */
	applyFilter() {
		this.setData({
			showFilterModal: false
		});
		this._loadData(true);
	},

	/**
	 * 重置日志表单
	 */
	_resetFormJournal() {
		// 设置默认值
		const today = this._formatDate(new Date());
		this.setData({
			formJournal: {
				date: today,
				mood: this.data.moods[0],
				sleepHours: '',
				activityLevel: this.data.activityLevels[0],
				symptoms: [],
				notes: ''
			},
			moodIndex: 0,
			activityIndex: 0,
			selectedSymptoms: {}
		});
	},

	/**
	 * 格式化日期为 YYYY-MM-DD
	 */
	_formatDate(date) {
		// 不再依赖timeHelper，直接使用原生JS格式化日期
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	},

	/**
	 * 验证日期格式是否为YYYY-MM-DD
	 */
	_isValidDateFormat(dateString) {
		const regex = /^\d{4}-\d{2}-\d{2}$/;
		if (!regex.test(dateString)) return false;
		
		// 进一步验证日期是否有效
		const date = new Date(dateString);
		const timestamp = date.getTime();
		if (isNaN(timestamp)) return false;
		
		return date.toISOString().slice(0, 10) === dateString;
	}
});