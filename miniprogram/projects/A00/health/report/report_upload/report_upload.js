const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');
const timeHelper = require('../../../../../helper/time_helper.js');

Page({
  data: {
    reportDate: '',
    hospital: '',
    reportType: '',
    summary: '',
    reportFileId: '',
    reportFileName: '',
    reportItems: [],
    enableAIAnalysis: true, // 是否开启AI自动分析

    // 报告类型选项
    reportTypeOptions: ['常规体检', '年度体检', '健康证体检', '婚前体检', '其他']
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 设置默认日期为今天
    this.setData({
      reportDate: timeHelper.time('Y-M-D')
    });
  },

  /**
   * 选择日期
   */
  bindDateChange: function(e) {
    this.setData({
      reportDate: e.detail.value
    });
  },

  /**
   * 选择报告类型
   */
  bindReportTypeChange: function(e) {
    this.setData({
      reportType: this.data.reportTypeOptions[e.detail.value]
    });
  },

  /**
   * 输入医院名称
   */
  bindHospitalInput: function(e) {
    this.setData({
      hospital: e.detail.value
    });
  },

  /**
   * 输入报告摘要
   */
  bindSummaryInput: function(e) {
    this.setData({
      summary: e.detail.value
    });
  },

  /**
   * 切换AI自动分析
   */
  bindAIAnalysisChange: function(e) {
    this.setData({
      enableAIAnalysis: e.detail.value
    });
  },

  /**
   * 选择文件并上传到云存储
   */
  bindChooseFile: function() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'jpg', 'jpeg', 'png'],
      success: res => {
        const filePath = res.tempFiles[0].path;
        const fileName = res.tempFiles[0].name;
        const cloudPath = 'medical_reports/' + Date.now() + '-' + fileName;
        
        pageHelper.showLoading('上传中');
        
        wx.cloud.uploadFile({
          cloudPath,
          filePath,
          success: uploadRes => {
            pageHelper.hideLoading();
            this.setData({ 
              reportFileId: uploadRes.fileID,
              reportFileName: fileName
            });
            pageHelper.showSuccToast('文件上传成功');
          },
          fail: err => {
            pageHelper.hideLoading();
            pageHelper.showModal('文件上传失败，请重试');
            console.error(err);
          }
        });
      }
    });
  },

  /**
   * 提交表单
   */
  bindFormSubmit: async function() {
    // 表单验证
    if (!this.data.reportDate) {
      pageHelper.showModal('请选择体检日期');
      return;
    }
    if (!this.data.hospital) {
      pageHelper.showModal('请输入医院名称');
      return;
    }
    if (!this.data.reportType) {
      pageHelper.showModal('请选择报告类型');
      return;
    }
    if (!this.data.reportFileId) {
      pageHelper.showModal('请上传体检报告文件');
      return;
    }
    
    try {
      const params = {
        reportDate: this.data.reportDate,
        hospital: this.data.hospital,
        reportType: this.data.reportType,
        reportItems: this.data.reportItems,
        reportFileId: this.data.reportFileId,
        summary: this.data.summary,
        enableAIAnalysis: this.data.enableAIAnalysis
      };
      
      let options = {
        title: '提交中'
      };
      
      await cloudHelper.callCloudData('medicalReport', {
        action: 'uploadReport',
        params
      }, options);
      
      pageHelper.showSuccToast('上传成功', 1500);
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      
    } catch (err) {
      console.error(err);
      pageHelper.showModal('上传失败，请重试');
    }
  }
}) 