const cloudHelper = require('../../../../../helper/cloud_helper.js');
const pageHelper = require('../../../../../helper/page_helper.js');

Page({
  data: {
    isLoad: false,
    reportId: '',
    report: null,
    showAiResult: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (!options || !options.id) {
      pageHelper.showNoneToast('报告ID参数错误');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      reportId: options.id
    });
    this._loadReportDetail();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: async function () {
    await this._loadReportDetail();
    wx.stopPullDownRefresh();
  },

  /**
   * 获取体检报告详情
   */
  _loadReportDetail: async function () {
    try {
      const params = {
        reportId: this.data.reportId
      };
      let options = {
        title: '加载中'
      };

      const result = await cloudHelper.callCloudData('medicalReport', {
        action: 'getReportDetail',
        params
      }, options);

      this.setData({
        report: result.data,
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
   * 查看报告原始文件
   */
  bindViewFileTap: function () {
    if (!this.data.report || !this.data.report.reportFileId) {
      pageHelper.showModal('未找到报告文件');
      return;
    }

    // 根据文件ID获取临时链接并打开
    wx.cloud.getTempFileURL({
      fileList: [this.data.report.reportFileId],
      success: res => {
        const tempFileURL = res.fileList[0].tempFileURL;
        this._openFile(tempFileURL);
      },
      fail: err => {
        console.error(err);
        pageHelper.showModal('获取文件失败，请重试');
      }
    });
  },

  /**
   * 打开文件预览
   */
  _openFile: function (fileUrl) {
    // 判断文件类型
    const fileType = fileUrl.substring(fileUrl.lastIndexOf('.') + 1).toLowerCase();
    if (['jpg', 'jpeg', 'png'].includes(fileType)) {
      // 图片预览
      wx.previewImage({
        urls: [fileUrl]
      });
    } else if (fileType === 'pdf') {
      // PDF预览
      wx.downloadFile({
        url: fileUrl,
        success: function (res) {
          const filePath = res.tempFilePath;
          wx.openDocument({
            filePath: filePath,
            showMenu: true
          });
        },
        fail: function (err) {
          console.error(err);
          pageHelper.showModal('文件打开失败，请重试');
        }
      });
    } else {
      pageHelper.showModal('不支持的文件类型');
    }
  },

  /**
   * 开始AI分析
   */
  bindAnalyzeByAI: async function () {
    try {
      pageHelper.showLoading('AI分析中');

      // 准备要分析的内容
      let reportContent = '';
      if (this.data.report.summary) {
        reportContent += '摘要：' + this.data.report.summary + '\n';
      }

      // 添加体检项目内容
      if (this.data.report.reportItems && this.data.report.reportItems.length > 0) {
        this.data.report.reportItems.forEach(section => {
          reportContent += section.name + '：\n';
          section.items.forEach(item => {
            reportContent += `${item.name}：${item.value}${item.unit || ''} (参考范围：${item.referenceRange || '无'}) ${item.abnormal ? '异常' : '正常'}\n`;
          });
        });
      }

      const params = {
        reportId: this.data.reportId,
        reportContent: reportContent
      };

      const result = await cloudHelper.callCloudData('medicalReport', {
        action: 'analyzeReportByAI',
        params
      });

      pageHelper.hideLoading();

      // 重新加载报告数据以获取AI分析结果
      await this._loadReportDetail();

      // 显示AI分析结果
      this.setData({
        showAiResult: true
      });

    } catch (err) {
      pageHelper.hideLoading();
      console.error(err);
      pageHelper.showModal('AI分析失败，请重试');
    }
  },

  /**
   * 显示AI分析结果
   */
  bindViewAiResult: function () {
    this.setData({
      showAiResult: true
    });
  },

  /**
   * 关闭AI分析结果
   */
  bindCloseAiResult: function () {
    this.setData({
      showAiResult: false
    });
  }
}) 