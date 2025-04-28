// 引入项目公共逻辑类
const ProjectBiz = require('../../../biz/project_biz.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');

/**
 * 体检报告列表页面逻辑
 * 
 * 功能说明：
 * 1. 展示用户的所有体检报告列表
 * 2. 支持分页加载更多报告
 * 3. 提供报告详情查看入口
 * 4. 支持报告筛选和搜索功能
 */
Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false, // 是否已经加载
		_params: null, // 路由参数

		sortMenus: [
			{ label: '全部', type: 'all', value: 0 },
			{ label: '最新', type: 'time', value: 0 },
			{ label: '医院', type: 'hospital', value: 0 },
		], // 排序菜单配置

		sortItems: [], // 当前排序项目
		sortType: '', // 当前排序类型
		sortVal: null, // 当前排序值

		list: [], // 报告列表数据
		isAllList: false, // 是否已加载全部数据
	},

	/**
	 * 生命周期函数--监听页面加载
	 * 接收并处理路由参数
	 */
	onLoad: function (options) {
		// 初始化项目业务逻辑
		ProjectBiz.initPage(this);

		// 设置页面标题
		wx.setNavigationBarTitle({
			title: '体检报告列表',
		});

		// 获取路由参数
		if (options && options.id) {
			this.setData({
				_params: {
					id: options.id
				}
			});
		}

		// 初始化排序菜单
		this._setSortItems();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 * 页面显示时加载数据
	 */
	onShow: function () {
		// 加载报告列表数据
		this._loadList();
	},

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () { },

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () { },

	/**
	 * 设置排序相关数据
	 * 初始化排序菜单项目
	 */
	_setSortItems: function () {
		// 提取排序菜单中第一个排序类型作为默认排序
		let sortItems = [];
		let sortMenus = this.data.sortMenus;

		for (let k in sortMenus) {
			let item = {};
			item.type = sortMenus[k].type;
			item.value = sortMenus[k].value;
			sortItems.push(item);
		}

		// 设置默认排序类型和排序值
		this.setData({
			sortItems,
			sortType: sortItems[0].type,
			sortVal: sortItems[0].value
		});
	},

	/**
	 * 数据列表初始化
	 * 清空现有数据并重新加载第一页
	 */
	_loadList: async function () {
		try {
			// 显示加载中
			if (this.data.list.length == 0) {
				pageHelper.showLoading('加载中');
			}

			// 构建查询参数
			let params = {
				page: 1,
				size: 20,
				sortType: this.data.sortType,
				sortVal: this.data.sortVal
			};

			// 如果有路由传入的参数则合并
			if (this.data._params && this.data._params.id) {
				params.id = this.data._params.id;
			}

			// 调用云函数获取数据
			let res = await cloudHelper.callCloudData('medical_report/get_report_list', params);

			// 处理返回的数据，格式化日期显示
			for (let k in res.list) {
				res.list[k].REPORT_ADD_TIME = pageHelper.fmtDateByTimestamp(res.list[k].REPORT_ADD_TIME);
			}

			// 更新页面数据
			this.setData({
				isLoad: true,
				list: res.list,
				isAllList: res.list.length < 20 // 如果返回数据不足20条，表示已加载全部
			});

			// 关闭加载提示
			if (this.data.list.length == 0) {
				pageHelper.showNoneToast('暂无体检报告');
			}
		} catch (err) {
			console.error(err);
			pageHelper.showErrToast('体检报告加载失败，请重试');
		}
	},

	/**
	 * 加载更多数据
	 * 用于分页加载更多报告
	 */
	_loadMoreList: async function () {
		try {
			// 显示加载中
			pageHelper.showLoading('加载中');

			// 构建查询参数
			let params = {
				page: Math.ceil(this.data.list.length / 20) + 1,
				size: 20,
				sortType: this.data.sortType,
				sortVal: this.data.sortVal
			};

			// 如果有路由传入的参数则合并
			if (this.data._params && this.data._params.id) {
				params.id = this.data._params.id;
			}

			// 调用云函数获取数据
			let res = await cloudHelper.callCloudData('medical_report/get_report_list', params);

			// 处理返回的数据，格式化日期显示
			for (let k in res.list) {
				res.list[k].REPORT_ADD_TIME = pageHelper.fmtDateByTimestamp(res.list[k].REPORT_ADD_TIME);
			}

			// 数据合并并更新页面
			let list = this.data.list.concat(res.list);
			this.setData({
				list,
				isAllList: res.list.length < 20 // 如果返回数据不足20条，表示已加载全部
			});
		} catch (err) {
			console.error(err);
			pageHelper.showErrToast('更多数据加载失败');
		}
	},

	/**
	 * 下拉刷新
	 * 清空数据并重新加载第一页
	 */
	onPullDownRefresh: async function () {
		await this._loadList();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件
	 * 触发加载更多数据
	 */
	onReachBottom: async function () {
		// 如果已经加载全部数据，则不再请求
		if (this.data.isAllList) return;
		// 加载更多数据
		await this._loadMoreList();
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage: function () { },

	/**
	 * 点击排序菜单
	 * @param {Object} e 事件对象
	 */
	bindSortTap: function (e) {
		let sortType = e.currentTarget.dataset.type;
		let sortVal = e.currentTarget.dataset.val;

		// 更新排序条件并重新加载数据
		this.setData({
			sortType,
			sortVal
		});
		this._loadList();
	},

	/**
	 * 点击报告项，跳转到详情页
	 * @param {Object} e 事件对象
	 */
	bindReportTap: function (e) {
		// 获取当前点击的报告ID
		let id = pageHelper.dataset(e, 'id');
		
		// 跳转到报告详情页
		wx.navigateTo({
			url: '../report_detail/report_detail?id=' + id,
		});
	},

	/**
	 * 点击上传新报告按钮
	 */
	bindUploadTap: function () {
		// 跳转到报告上传页面
		wx.navigateTo({
			url: '../report_upload/report_upload',
		});
	},

	/**
	 * 搜索报告
	 * @param {Object} e 搜索事件对象
	 */
	bindSearchInput: function (e) {
		// 获取搜索关键词
		let search = e.detail.trim();
		this.setData({
			search
		});
	},

	/**
	 * 执行搜索
	 */
	bindSearchTap: function () {
		// 搜索关键词为空则不执行搜索
		if (!this.data.search) return;
		this._loadList();
	},

	/**
	 * 清除搜索关键词
	 */
	bindClearSearchTap: function () {
		// 清空搜索关键词并重新加载数据
		this.setData({
			search: ''
		});
		this._loadList();
	}
}); 