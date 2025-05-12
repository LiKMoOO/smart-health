// projects/A00/health/medication/health_medication.js
const cloudHelper = require('../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../helper/page_helper.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		medicationList: [],
		search: '',
		currentStatus: 'all', // 当前筛选状态: all, 1(进行中), 0(已完成), 2(已暂停)
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function (options) {
		// 初始化页面
		this._loadMedicationList();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady() {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {
		// 每次显示页面都刷新列表
		this._loadMedicationList();
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
	onPullDownRefresh: async function () {
		await this._loadMedicationList();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom: function () {
		this.bindReachBottom();
	},

	/**
	 * 触底加载更多
	 */
	bindReachBottom: async function() {
		// 如果已经没有更多数据，直接返回
		if (this.data.isLoad && this.data.medicationList.length > 0 && this.data.medicationList.length >= this.data.total) {
			return;
		}
		
		// 加载下一页
		const page = this.data.page + 1;
		await this._loadMedicationList(false, page);
	},

	/**
	 * 加载用药提醒列表
	 * @param {boolean} isReresh - 是否刷新
	 * @param {number} page - 页码
	 */
	_loadMedicationList: async function(isReresh = true, page = 1) {
		try {
			if (isReresh) {
				// 显示加载中
				this.setData({
					isLoad: false
				});
			}

			// 构建查询参数
			const params = {
				page: page,
				size: 10,
				keyword: this.data.search || '',
				orderBy: 'nextReminderTime',
				orderDir: 'asc'
			};

			// 添加状态筛选
			if (this.data.currentStatus !== 'all') {
				params.status = parseInt(this.data.currentStatus);
			}

			// 调用云函数获取数据
			const result = await cloudHelper.callCloudData('medicationReminder', {
				action: 'getMedicationList',
				params: params
			}, {
				title: 'bar'
			});

			// 处理返回数据
			if (!result || !result.data) {
				if (isReresh) {
					this.setData({
						isLoad: true,
						medicationList: [],
						page: 1,
						total: 0
					});
				}
				return;
			}

			// 拼接数据
			let medicationList = [];
			if (isReresh) {
				medicationList = result.data.list || [];
			} else {
				medicationList = this.data.medicationList.concat(result.data.list || []);
			}

			this.setData({
				isLoad: true,
				medicationList: medicationList,
				page: result.data.page || 1,
				total: result.data.total || 0
			});

		} catch (err) {
			console.error('加载用药提醒列表失败', err);
			if (isReresh) {
				this.setData({
					isLoad: true,
					medicationList: [],
					page: 1,
					total: 0
				});
				pageHelper.showModal('加载失败，请稍后重试');
			}
		}
	},

	/**
	 * 搜索输入处理
	 * @param {object} e - 事件对象
	 */
	bindSearchInput: function(e) {
		this.setData({
			search: e.detail.value
		});

		// 输入完毕后延迟500ms再搜索
		clearTimeout(this.searchTimer);
		this.searchTimer = setTimeout(() => {
			this._loadMedicationList();
		}, 500);
	},

	/**
	 * 筛选按钮点击处理
	 * @param {object} e - 事件对象
	 */
	bindFilterTap: function(e) {
		const status = e.currentTarget.dataset.status;
		
		// 如果点击当前已选中的筛选项，不做处理
		if (status === this.data.currentStatus) return;
		
		this.setData({
			currentStatus: status
		});
		
		// 重新加载数据
		this._loadMedicationList();
	},

	/**
	 * 点击用药项处理
	 * @param {object} e - 事件对象
	 */
	bindMedicationTap: function(e) {
		const id = e.currentTarget.dataset.id;
		if (!id) return;
		
		// 跳转到详情页
		wx.navigateTo({
			url: './medication_detail/medication_detail?id=' + id,
		});
	},

	/**
	 * 添加按钮点击处理
	 */
	bindAddTap: function() {
		wx.navigateTo({
			url: '/projects/A00/health/medication/medication_add/medication_add',
			fail: function(err) {
				console.error('跳转失败：', err);
				pageHelper.showModal('页面跳转失败，请重试');
			}
		});
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {

	}
})