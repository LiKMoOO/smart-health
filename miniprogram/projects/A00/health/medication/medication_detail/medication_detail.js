// projects/A00/health/medication/medication_detail/medication_detail.js
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		medicationId: '',
		medication: null,
		
		// 状态文字映射
		statusDesc: {
			0: '已完成',
			1: '进行中',
			2: '已暂停'
		}
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad(options) {
		if (!options || !options.id) {
			pageHelper.showModal('参数错误', '缺少用药提醒ID');
			wx.navigateBack();
			return;
		}
		
		this.setData({
			medicationId: options.id
		});
		
		this._loadDetail();
	},

	/**
	 * 加载用药提醒详情
	 */
	_loadDetail: async function() {
		try {
			const result = await cloudHelper.callCloudData('medicationReminder', {
				action: 'getMedicationDetail',
				params: {
					id: this.data.medicationId
				}
			});
			
			if (!result || !result.data) {
				pageHelper.showModal('数据获取失败', '未找到相关记录');
				setTimeout(() => {
					wx.navigateBack();
				}, 1500);
				return;
			}
			
			this.setData({
				isLoad: true,
				medication: result.data
			});
		} catch (err) {
			console.error('获取用药提醒详情失败', err);
			pageHelper.showModal('加载失败', '请检查网络后重试');
		}
	},
	
	/**
	 * 编辑按钮点击
	 */
	bindEditTap: function() {
		wx.navigateTo({
			url: '../medication_edit/medication_edit?id=' + this.data.medicationId,
		});
	},
	
	/**
	 * 删除按钮点击
	 */
	bindDeleteTap: function() {
		const that = this;
		pageHelper.showConfirm('确认删除', '删除后无法恢复，是否继续？', async function() {
			try {
				await cloudHelper.callCloudData('medicationReminder', {
					action: 'deleteMedication',
					params: {
						id: that.data.medicationId
					}
				});
				
				pageHelper.showSuccToast('删除成功');
				setTimeout(() => {
					wx.navigateBack();
				}, 1500);
			} catch (err) {
				console.error('删除失败', err);
				pageHelper.showModal('删除失败', '请检查网络后重试');
			}
		});
	},
	
	/**
	 * 状态变更按钮点击
	 */
	bindStatusChangeTap: async function(e) {
		const status = Number(e.currentTarget.dataset.status);
		if (status === undefined) return;
		
		try {
			const medication = this.data.medication;
			
			// 状态值：1(进行中)，0(已完成)，2(已暂停)
			let newStatus = 1; // 默认改为进行中
			let statusDesc = '';
			
			if (medication.status === 1) {
				// 当前为进行中，可以暂停或完成
				if (status === 2) {
					newStatus = 2;
					statusDesc = '已暂停';
				} else if (status === 0) {
					newStatus = 0;
					statusDesc = '已完成';
				}
			} else {
				// 非进行中状态，只能改为进行中
				newStatus = 1;
				statusDesc = '进行中';
			}
			
			await cloudHelper.callCloudData('medicationReminder', {
				action: 'updateMedication',
				params: {
					id: this.data.medicationId,
					status: newStatus
				}
			});
			
			pageHelper.showSuccToast(`已更新为${statusDesc}`);
			
			// 更新本地数据
			this.setData({
				'medication.status': newStatus
			});
		} catch (err) {
			console.error('状态更新失败', err);
			pageHelper.showModal('更新失败', '请检查网络后重试');
		}
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
		// 每次显示页面时刷新数据
		if (this.data.medicationId) {
			this._loadDetail();
		}
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
		this._loadDetail();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom() {

	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {

	}
})