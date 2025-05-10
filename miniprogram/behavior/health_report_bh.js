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
		
		// 搜索相关
		search: '', // 搜索关键词
		originalReportList: [], // 原始报告列表，用于搜索

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
			
			// 尝试获取用户ID
			const userId = wx.getStorageSync('OPENID');
			
			// 如果用户ID不存在，先获取用户ID
			if (!userId) {
				wx.showLoading({
					title: '加载中...',
					mask: true
				});
				
				try {
					// 尝试获取用户OpenID
					await new Promise((resolve, reject) => {
						wx.cloud.callFunction({
							name: 'cloud',
							data: {},
							success: res => {
								console.log('获取OpenID成功:', res);
								if (res.result && res.result.openId) {
									wx.setStorageSync('OPENID', res.result.openId);
									console.log('用户OpenID已保存:', res.result.openId);
									resolve();
								} else if (res.result && res.result.event && res.result.event.userInfo && res.result.event.userInfo.openId) {
									wx.setStorageSync('OPENID', res.result.event.userInfo.openId);
									console.log('用户OpenID已保存(从event):', res.result.event.userInfo.openId);
									resolve();
								} else {
									reject(new Error('获取用户ID失败'));
								}
							},
							fail: err => {
								console.error('获取用户ID失败:', err);
								reject(err);
							}
						});
					});
					
					wx.hideLoading();
				} catch (err) {
					wx.hideLoading();
					console.error('获取用户ID失败:', err);
					pageHelper.showModal('获取用户信息失败，请重启小程序');
					return;
				}
			}
			
			// 重新获取用户ID（可能刚刚设置了）
			const finalUserId = wx.getStorageSync('OPENID');
			if (!finalUserId) {
				pageHelper.showModal('无法获取用户信息，请退出并重新进入小程序');
				return;
			}
			
			while (retryCount <= maxRetries) {
				try {
					wx.showLoading({
						title: '加载中...',
						mask: true
					});

					// 准备云函数调用参数
					// 确保传递正确的用户ID
					const params = {
						userId: finalUserId
					};

					// 调用云函数
					const result = await cloudHelper.callCloudData('medicalReport', {
						action: 'getReportList',
						params: params
					}, opts);

					wx.hideLoading();
					
					// 处理后台返回的数据
					console.log('报告列表返回结果:', result);
					
					// 检查返回的结果是否有效
					if (!result) {
						// 如果数据为空且还有重试机会，继续重试
						if (retryCount < maxRetries) {
							console.log(`加载报告列表第${retryCount+1}/${maxRetries+1}次失败，正在重试...`);
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

					// 获取报告列表数据
					let reportData = null;
					if (result.data) {
						reportData = result.data;
					}

					// 更新页面数据
					this.setData({
						isLoad: true,
						reportList: reportData,
						originalReportList: reportData // 保存原始数据用于搜索
					});

					// 处理空数据的情况
					if (!reportData || reportData.length === 0) {
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
		 * 搜索框输入事件处理
		 * @param {Object} e - 事件对象 
		 */
		bindSearchInput: function(e) {
			// 获取搜索关键词
			const keyword = e.detail.value.toLowerCase();
			this.setData({
				search: keyword
			});
			
			// 如果关键词为空，恢复原始列表
			if (!keyword) {
				this.setData({
					reportList: this.data.originalReportList
				});
				return;
			}
			
			// 根据关键词过滤报告列表
			const filtered = this.data.originalReportList.filter(item => {
				// 匹配医院名称、体检类型、概述中是否包含关键词
				return (
					(item.hospital && item.hospital.toLowerCase().includes(keyword)) ||
					(item.reportType && item.reportType.toLowerCase().includes(keyword)) ||
					(item.summary && item.summary.toLowerCase().includes(keyword))
				);
			});
			
			// 更新显示的列表
			this.setData({
				reportList: filtered
			});
			
			// 显示搜索结果提示
			if (filtered.length === 0) {
				pageHelper.showNoneToast('未找到相关报告');
			}
		},

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
				
				// 获取用户ID
				const userId = wx.getStorageSync('OPENID');
				if (!userId) {
					pageHelper.showModal('无法获取用户信息，请退出并重新进入小程序');
					return;
				}
				
				// 准备请求参数
				let params = {
					reportId: id,
					userId: userId // 确保传递用户ID
				};

				// 调用云函数获取报告详情
				let result = await cloudHelper.callCloudData('medicalReport', {
					action: 'getReportDetail',
					params: params
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

		/**
		 * 点击报告项，跳转到详情页
		 * @param {Object} e - 事件对象
		 */
		bindReportTap: function (e) {
			let id = pageHelper.dataset(e, 'id');
			console.log('点击报告，报告ID:', id);
			
			if (!id) return;
			
			wx.navigateTo({
				url: '/projects/A00/health/report/report_detail/report_detail?id=' + id
			});
		},

		url: function (e) {
			pageHelper.url(e, this);
		}
	}
}); 