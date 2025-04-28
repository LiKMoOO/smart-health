// projects/A00/health/report/health_report.js
const pageHelper = require('../../../../helper/page_helper.js');
const helper = require('../../../../helper/helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		reportList: [],
		
		// 上拉加载相关变量
		dataList: [],
		sortType: '',
		sortVal: '',
		
		page: 1,
		loading: false,
		noMore: false
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		await this._loadReportList();
	},

	/**
	 * 获取体检报告列表
	 */
	_loadReportList: async function () {
		try {
			const params = {
				page: this.data.page,
				sortType: this.data.sortType,
				sortVal: this.data.sortVal
			};
			
			let options = {
				title: '加载中'
			}
			
			const result = await cloudHelper.callCloudData('medicalReport', { 
				action: 'getReportList', 
				params 
			}, options);
			
			let dataList = result.data;
			
			// 分页处理
			if (this.data.page > 1) {
				dataList = this.data.dataList.concat(dataList);
			}
			
			this.setData({
				reportList: dataList,
				dataList,
				isLoad: true,
				noMore: result.data.length === 0,
				loading: false
			});
		} catch (err) {
			console.error(err);
			this.setData({
				isLoad: true,
				loading: false
			});
		}
	},

	/**
	 * 格式化日期
	 */
	_formatDate(date) {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		const day = date.getDate().toString().padStart(2, '0');
		return `${year}-${month}-${day}`;
	},

	/**
	 * 上传新报告
	 */
	bindUploadTap: function () {
		wx.navigateTo({
			url: './report_upload/report_upload',
		});
	},

	/**
	 * 查看报告详情
	 */
	bindViewTap: function (e) {
		const id = pageHelper.dataset(e, 'id');
		wx.navigateTo({
			url: './report_detail/report_detail?id=' + id,
		});
	},
	
	/**
	 * 触发AI分析
	 */
	bindAnalysisTap: async function (e) {
		const id = pageHelper.dataset(e, 'id');
		
		try {
			let options = {
				title: 'AI分析中'
			}
			
			const result = await cloudHelper.callCloudData('medicalReport', { 
				action: 'analyzeReportByAI', 
				params: {
					reportId: id
				}
			}, options);
			
			// 更新本地数据
			const reportList = this.data.reportList.map(report => {
				if (report._id === id) {
					return {
						...report,
						aiAnalysis: result.data
					};
				}
				return report;
			});
			
			this.setData({
				reportList,
				dataList: reportList
			});
			
			pageHelper.showSuccToast('AI分析完成');
		} catch (err) {
			console.error('AI分析失败', err);
			pageHelper.showModal('AI分析失败，请重试');
		}
	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		// 重置页码
		this.setData({
			page: 1,
			noMore: false
		});
		
		await this._loadReportList();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom() {
		if (this.data.noMore) return;
		
		this.setData({
			page: this.data.page + 1,
			loading: true
		});
		
		this._loadReportList();
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {
		return {
			title: '体检报告管理',
			path: '/projects/A00/health/report/health_report'
		}
	}
})