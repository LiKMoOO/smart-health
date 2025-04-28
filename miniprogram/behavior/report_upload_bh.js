const cloudHelper = require('../helper/cloud_helper.js');
const pageHelper = require('../helper/page_helper.js');
const timeHelper = require('../helper/time_helper.js');

module.exports = Behavior({
  data: {
    reportDate: '',
    hospital: '',
    reportType: '',
    summary: '',
    reportFileId: '',
    reportFileName: '',
    reportItems: [],
    reportTypeOptions: ['常规体检', '年度体检', '健康证体检', '婚前体检', '其他']
  },
  methods: {
    onLoad: function () {
      this.setData({ reportDate: timeHelper.time('Y-M-D') });
    },
    bindDateChange: function(e) {
      this.setData({ reportDate: e.detail.value });
    },
    bindReportTypeChange: function(e) {
      this.setData({ reportType: this.data.reportTypeOptions[e.detail.value] });
    },
    bindHospitalInput: function(e) {
      this.setData({ hospital: e.detail.value });
    },
    bindSummaryInput: function(e) {
      this.setData({ summary: e.detail.value });
    },
    chooseReportFile: function() {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['pdf', 'jpg', 'jpeg', 'png'],
        success: res => {
          const file = res.tempFiles[0];
          wx.showLoading({ title: '上传中...', mask: true });
          wx.cloud.uploadFile({
            cloudPath: 'health/report/' + Date.now() + '_' + file.name,
            filePath: file.path,
            success: uploadRes => {
              this.setData({
                reportFileId: uploadRes.fileID,
                reportFileName: file.name
              });
              wx.hideLoading();
              pageHelper.showSuccToast('文件上传成功');
            },
            fail: err => {
              wx.hideLoading();
              pageHelper.showModal('文件上传失败，请重试');
            }
          });
        }
      });
    },
    onSubmit: async function() {
      const { reportDate, hospital, reportType, summary, reportFileId } = this.data;
      const userId = wx.getStorageSync('openid') || '';
      if (!reportDate || !hospital || !reportType || !reportFileId) {
        pageHelper.showModal('请填写完整信息并上传报告文件');
        return;
      }
      try {
        wx.showLoading({ title: '上传中...', mask: true });
        const params = { userId, reportDate, hospital, reportType, summary, reportFileId };
        const result = await cloudHelper.callCloudData('cloud', {
          PID: 'A00',
          route: 'medicalReport',
          action: 'uploadReport',
          params
        });
        wx.hideLoading();
        if (result && result.code === 0) {
          pageHelper.showSuccToast('上传成功');
          setTimeout(() => wx.navigateBack(), 1000);
        } else {
          pageHelper.showModal(result.msg || '上传失败');
        }
      } catch (err) {
        wx.hideLoading();
        pageHelper.showModal('上传失败，请重试');
      }
    }
  }
}); 