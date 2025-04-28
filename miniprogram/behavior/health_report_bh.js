const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');
const setting = require('../setting/setting.js');

/**
 * 体检报告列表behavior
 * 
 * 云函数调用说明：
 * 1. 通过cloudHelper.callCloudData调用云函数
 * 2. 云函数路径：cloud -> medicalReport -> getReportList/getReportDetail
 * 3. 调用参数：
 *    - PID: 项目ID，固定为'A00'
 *    - route: 路由名称，固定为'medicalReport'
 *    - action: 操作类型，'getReportList'或'getReportDetail'
 *    - params: 业务参数
 */
module.exports = Behavior({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false, // 是否已加载数据
		reportList: [], // 报告列表数据

		// 当前选中的报告
		currentReport: null,
	},

	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 * @param {Object} options 页面参数
		 */
		onLoad: function (options) {
			// 处理页面参数
			if (!pageHelper.getOptions(this, options)) return;
			// 加载报告列表
			this._loadReportList();
		},

		/**
		 * 加载报告列表
		 * 云函数调用过程：
		 * 1. 准备调用参数
		 * 2. 调用cloud云函数
		 * 3. 路由到medicalReport
		 * 4. 执行getReportList操作
		 * 5. 返回报告列表数据
		 */
		_loadReportList: async function () {
			// 云函数调用配置
			let opts = {
				title: 'bar'
			};
			
			// 添加重试机制，最多重试2次
			let retryCount = 0;
			const maxRetries = 2;
			
			while (retryCount <= maxRetries) {
				try {
					wx.showLoading({
						title: '加载中...',
						mask: true
					});

					// 准备云函数调用参数
					const params = {};
					// 调用云函数
					// 说明：
					// 1. 'cloud'是云函数名称
					// 2. route指定路由到medicalReport模块
					// 3. action指定执行getReportList操作
					const result = await cloudHelper.callCloudData('cloud', {
						PID: 'A00', // 项目ID
						route: 'medicalReport', // 路由到体检报告模块
						action: 'getReportList', // 获取报告列表操作
						params // 业务参数
					}, opts);

					wx.hideLoading();
					
					// 处理后台返回的数据
					if (!result || !result.data) {
						// 如果数据为空且还有重试机会，继续重试
						if (retryCount < maxRetries) {
							console.log(`加载报告列表第${retryCount+1}次失败，正在重试...`);
							retryCount++;
							await new Promise(resolve => setTimeout(resolve, 1000));
							continue;
						}
						
						// 重试次数用完，显示错误
						this.setData({
							isLoad: null,
							error: '数据不存在或已删除'
						});
						return;
					}

					// 更新页面数据
					this.setData({
						isLoad: true,
						reportList: result.data
					});

					// 处理空数据的情况
					if (result.data.length === 0) {
						pageHelper.showNoneToast('暂无体检报告');
					}
					
					return; // 成功加载，退出重试循环
					
				} catch (err) {
					console.error(`加载报告列表失败 (尝试 ${retryCount+1}/${maxRetries+1})：`, err);
					retryCount++;
					
					if (retryCount > maxRetries) {
						// 所有重试都失败，显示错误信息
						wx.hideLoading();
						this.setData({
							isLoad: null,
							error: '数据加载失败，请返回后重试'
						});
						pageHelper.showModal('加载失败，请重试');
					} else {
						// 等待一秒后重试
						await new Promise(resolve => setTimeout(resolve, 1000));
					}
				}
			}
		},

		/**
		 * 生命周期函数--监听页面初次渲染完成
		 */
		onReady: function () { },

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: async function () {
			// 每次显示页面时刷新列表
			await this._loadReportList();
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
		 * 页面相关事件处理函数--监听用户下拉动作
		 */
		onPullDownRefresh: async function () {
			await this._loadReportList();
			wx.stopPullDownRefresh();
		},

		/**
		 * 页面上拉触底事件的处理函数
		 */
		onReachBottom: function () { },

		/**
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {
			return {
				title: '体检报告管理',
				path: '/projects/A00/health/report/health_report'
			}
		},

		/**
		 * 上传新报告
		 */
		bindUploadTap: function () {
			wx.navigateTo({
				url: '/projects/A00/health/report/report_upload/report_upload',
			});
		},

		/**
		 * 查看报告详情
		 * 云函数调用过程：
		 * 1. 获取报告ID
		 * 2. 调用cloud云函数
		 * 3. 路由到medicalReport
		 * 4. 执行getReportDetail操作
		 * 5. 获取成功后跳转到详情页
		 */
		bindViewTap: async function (e) {
			let id = pageHelper.dataset(e, 'id');
			if (!id) return;

			try {
				let opts = {
					title: 'bar'
				};
				// 准备请求参数
				let params = {
					reportId: id
				};

				// 调用云函数获取报告详情
				// 说明：
				// 1. 'cloud'是云函数名称
				// 2. route指定路由到medicalReport模块
				// 3. action指定执行getReportDetail操作
				let result = await cloudHelper.callCloudData('cloud', {
					PID: 'A00',
					route: 'medicalReport',
					action: 'getReportDetail',
					params
				}, opts);

				// 检查返回数据
				if (!result || !result.data) {
					pageHelper.showModal('报告信息不存在或已被删除');
					return;
				}

				// 跳转到详情页，传递报告ID
				wx.navigateTo({
					url: '/projects/A00/health/report/report_detail/report_detail?id=' + id,
				});

			} catch (err) {
				console.error('获取报告详情失败：', err);
				pageHelper.showModal('获取报告详情失败，请重试');
			}
		},

		url: function (e) {
			pageHelper.url(e, this);
		}
	}
}); 