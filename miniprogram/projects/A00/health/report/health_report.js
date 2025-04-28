// projects/A00/health/report/health_report.js
const pageHelper = require('../../../helper/page_helper.js');
const helper = require('../../../helper/helper.js');
const cloudHelper = require('../../../helper/cloud_helper.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		reportList: [],
		
		// 上传报告表单
		showUploadModal: false,
		formReport: {},
		reportFile: null,
		reportFileName: '',
		
		// 异常项分析
		showAnalysisModal: false,
		abnormalItems: []
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
			const params = {};
			let options = {
				title: '加载中'
			}
			const result = await cloudHelper.callCloudData('medicalReport', { action: 'getReportList', params }, options);
			this.setData({
				reportList: result.data,
				isLoad: true
			});
		} catch (err) {
			console.error(err);
			this.setData({
				isLoad: true
			});
		}
	},

	/**
	 * 打开上传报告弹窗
	 */
	onUploadReport() {
		this.setData({
			showUploadModal: true,
			formReport: {
				reportDate: this._formatDate(new Date())
			},
			reportFile: null,
			reportFileName: ''
		});
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
	 * 关闭上传报告弹窗
	 */
	onCloseUploadModal() {
		this.setData({
			showUploadModal: false
		});
	},

	/**
	 * 报告表单输入处理
	 */
	onReportInput(e) {
		const { field } = e.currentTarget.dataset;
		let { formReport } = this.data;
		formReport[field] = e.detail.value;
		this.setData({ formReport });
	},

	/**
	 * 选择报告文件
	 */
	chooseReportFile() {
		const that = this;
		wx.chooseMessageFile({
			count: 1,
			type: 'file',
			extension: ['pdf', 'jpg', 'jpeg', 'png'],
			success(res) {
				const file = res.tempFiles[0];
				that.setData({
					reportFile: file,
					reportFileName: file.name
				});
			}
		});
	},

	/**
	 * 保存体检报告
	 */
	async onSaveReport() {
		const { formReport, reportFile } = this.data;
		
		// 表单验证
		if (!formReport.reportDate) {
			return pageHelper.showModal('请选择体检日期');
		}
		if (!formReport.hospital) {
			return pageHelper.showModal('请输入医院名称');
		}
		if (!formReport.reportType) {
			return pageHelper.showModal('请输入体检类型');
		}
		if (!reportFile) {
			return pageHelper.showModal('请选择报告文件');
		}
		
		try {
			// 实际应用中应通过云函数上传文件并保存数据
			// 1. 上传文件
			// const fileResult = await cloudHelper.cloudUploadFile(reportFile.tempFilePath, 'health/report');
			
			// 2. 保存报告数据
			// await cloudHelper.callCloudData('health/saveReport', {
			//   ...formReport,
			//   reportFileId: fileResult.fileID
			// });
			
			// 模拟操作成功
			const newReport = {
				_id: new Date().getTime().toString(),
				...formReport,
				reportFileId: 'cloud://file-id',
				reportItems: []
			};
			
			// 更新本地数据
			let reportList = [newReport, ...this.data.reportList];
			
			this.setData({
				reportList,
				showUploadModal: false
			});
			
			pageHelper.showSuccToast('上传成功');
		} catch (err) {
			console.error('上传报告失败', err);
			pageHelper.showModal('上传失败，请重试');
		}
	},

	/**
	 * 查看报告详情
	 */
	viewReportDetail(e) {
		const id = e.currentTarget.dataset.id;
		const report = this.data.reportList.find(item => item._id === id);
		
		if (report && report.reportItems && report.reportItems.length > 0) {
			// 查找异常项目
			const abnormalItems = [];
			report.reportItems.forEach(category => {
				if (category.items) {
					category.items.forEach(item => {
						if (item.abnormal) {
							abnormalItems.push({
								...item,
								category: category.name
							});
						}
					});
				}
			});
			
			if (abnormalItems.length > 0) {
				this.setData({
					abnormalItems,
					showAnalysisModal: true
				});
				return;
			}
		}
		
		// 无异常项或无详细项目，直接显示报告文件
		// 实际应用中应跳转到查看文件页面
		pageHelper.showModal('体检报告正常，无异常项目');
		
		// 实际代码应类似：
		// wx.navigateTo({
		//   url: `/pages/health/report/detail?id=${id}`
		// });
	},

	/**
	 * 关闭异常项分析弹窗
	 */
	onCloseAnalysisModal() {
		this.setData({
			showAnalysisModal: false
		});
	},

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
	onReachBottom() {
		// 暂无分页加载
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {
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
	}
})