const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');
const AdminMeetBiz = require('../biz/admin_meet_biz.js');
const MeetBiz = require('../biz/meet_biz.js');
const setting = require('../setting/setting.js');

module.exports = Behavior({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,


		tabCur: 0,
		mainCur: 0,
		verticalNavTop: 0,

		showMind: true,
		showTime: false,
	},
	methods: {
		/**
		 * 生命周期函数--监听页面加载
		 */
		onLoad: function (options) {
			if (!pageHelper.getOptions(this, options)) return;

			this._loadDetail();
		},

		_loadDetail: async function () {
			let id = this.data.id;
			if (!id) return;

			let params = {
				id,
			};
			let opt = {
				title: 'bar'
			};
			
			// 添加重试机制
			let retryCount = 0;
			const maxRetries = 2;
			
			while (retryCount <= maxRetries) {
				try {
					let meet = await cloudHelper.callCloudData('meet/view', params, opt);
					
					// 处理后台可能返回null的情况
					if (!meet) {
						// 如果还有重试机会，继续尝试
						if (retryCount < maxRetries) {
							console.log(`加载预约详情第${retryCount+1}次失败，正在重试...`);
							retryCount++;
							await new Promise(resolve => setTimeout(resolve, 1000));
							continue;
						}
						
						this.setData({
							isLoad: null,
							error: '数据不存在或已删除'
						});
						return;
					}
					
					// 确保MEET_DAYS_SET是有效数组
					if (!meet.MEET_DAYS_SET || !Array.isArray(meet.MEET_DAYS_SET)) {
						meet.MEET_DAYS_SET = [];
					}
					
					// 防止其他字段空值
					if (!meet.MEET_TITLE) meet.MEET_TITLE = '';
					if (!meet.MEET_CONTENT) meet.MEET_CONTENT = '';

					this.setData({
						isLoad: true,
						meet, 
						canNullTime: setting.MEET_CAN_NULL_TIME
					});
					
					return; // 成功加载，退出
				} catch (e) {
					console.error(`加载预约详情失败 (尝试 ${retryCount+1}/${maxRetries+1})：`, e);
					retryCount++;
					
					if (retryCount > maxRetries) {
						// 所有重试都失败
						this.setData({
							isLoad: null,
							error: '数据加载失败，请返回后重试'
						});
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
		onReady: function () {

		},

		/**
		 * 生命周期函数--监听页面显示
		 */
		onShow: function () {

		},

		/**
		 * 生命周期函数--监听页面隐藏
		 */
		onHide: function () {

		},

		/**
		 * 生命周期函数--监听页面卸载
		 */
		onUnload: function () {

		},

		/**
		 * 页面相关事件处理函数--监听用户下拉动作
		 */
		onPullDownRefresh: async function () {
			await this._loadDetail();
			wx.stopPullDownRefresh();
		},

		/**
		 * 页面上拉触底事件的处理函数
		 */
		onReachBottom: function () {

		},

		/**
		 * 用户点击右上角分享
		 */
		onShareAppMessage: function () {

		},

		bindJoinTap: async function (e) {
			let dayIdx = pageHelper.dataset(e, 'dayidx');
			let timeIdx = pageHelper.dataset(e, 'timeidx');

			let time = this.data.meet.MEET_DAYS_SET[dayIdx].times[timeIdx];


			if (time.error) {
				if (time.error.includes('预约'))
					return pageHelper.showModal('该时段' + time.error + '，换一个时段试试吧！');
				else
					return pageHelper.showModal('该时段预约' + time.error + '，换一个时段试试吧！');
			}

			let meetId = this.data.id;
			let timeMark = time.mark;

			let callback = async () => {
				try {
					let opts = {
						title: '请稍候',
					}
					let params = {
						meetId,
						timeMark
					}
					await cloudHelper.callCloudSumbit('meet/before_join', params, opts).then(res => {
						wx.navigateTo({
							url: `../join/meet_join?id=${meetId}&timeMark=${timeMark}`,
						})
					});
				} catch (ex) {
					console.log(ex);
				}
			}
			MeetBiz.subscribeMessageMeet(callback);

		},

		url: function (e) {
			pageHelper.url(e, this);
		},

		onPageScroll: function (e) {
			console.log(111)
			if (e.scrollTop > 100) {
				this.setData({
					topShow: true
				});
			} else {
				this.setData({
					topShow: false
				});
			}
		},

		bindTopTap: function () {
			wx.pageScrollTo({
				scrollTop: 0
			})
		},

		bindVerticalMainScroll: function (e) {
			if (!this.data.isLoad) return;

			let list = this.data.meet.MEET_DAYS_SET;
			let tabHeight = 0;

			for (let i = 0; i < list.length; i++) {
				let view = wx.createSelectorQuery().in(this).select("#main-" + i);
				view.fields({
					size: true
				}, data => {
					list[i].top = tabHeight;
					tabHeight = tabHeight + data.height;
					list[i].bottom = tabHeight;
				}).exec();
			}

			let scrollTop = e.detail.scrollTop + 20; // + i*0.5; //TODO
			for (let i = 0; i < list.length; i++) {

				if (scrollTop > list[i].top && scrollTop < list[i].bottom) {

					this.setData({
						verticalNavTop: (i - 1) * 50,
						tabCur: i
					})
					return false;
				}
			}
		},

		bindTabSelectTap: function (e) {
			let idx = pageHelper.dataset(e, 'idx');
			this.setData({
				tabCur: idx,
				mainCur: idx,
				verticalNavTop: (idx - 1) * 50
			})
		},

		bindShowMindTap: function (e) {
			this.setData({
				showMind: true,
				showTime: false
			});
		},

		bindShowTimeTap: function (e) {
			this.setData({
				showMind: false,
				showTime: true
			});
		}
	}
})