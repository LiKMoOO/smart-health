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
    reportFiles: [], // 存储多个文件
    isMultipleFiles: false, // 是否允许多文件上传
    enableOcr: false, // 是否启用OCR识别
    isOcrProcessing: false, // OCR处理状态
    ocrResult: '', // OCR识别结果
    previewMode: false, // 文件预览模式
    currentPreviewUrl: '', // 当前预览的文件URL
    reportItems: [],
    reportTypeOptions: ['常规体检', '年度体检', '健康证体检', '婚前体检', '糖尿病筛查', '心脑血管检查', '体检套餐', '其他']
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
    // 切换多文件上传状态
    toggleMultipleFiles: function() {
      this.setData({ 
        isMultipleFiles: !this.data.isMultipleFiles,
        reportFiles: []  // 切换时清空已选文件
      });
    },
    // 切换OCR识别状态
    toggleOcr: function() {
      this.setData({ enableOcr: !this.data.enableOcr });
    },
    // 选择报告文件
    bindChooseFile: function() {
      const count = this.data.isMultipleFiles ? 9 : 1; // 多文件模式下最多9个文件
      
      wx.chooseMessageFile({
        count: count,
        type: 'file',
        extension: ['pdf', 'jpg', 'jpeg', 'png'],
        success: res => {
          const tempFiles = res.tempFiles;
          if (this.data.isMultipleFiles) {
            // 多文件模式
            this.setData({
              reportFiles: tempFiles
            });
          } else {
            // 单文件模式
            const file = tempFiles[0];
            // 如果是图片，提供预览功能
            if (/\.(jpg|jpeg|png)$/i.test(file.name)) {
              this.setData({
                currentPreviewUrl: file.path,
                previewMode: true
              });
            }
            
            this.uploadSingleFile(file);
          }
        }
      });
    },
    
    // 上传单个文件
    uploadSingleFile: function(file) {
      wx.showLoading({ title: '上传中...', mask: true });
      wx.cloud.uploadFile({
        cloudPath: 'health/report/' + Date.now() + '_' + file.name,
        filePath: file.path,
        success: uploadRes => {
          this.setData({
            reportFileId: uploadRes.fileID,
            reportFileName: file.name
          });
          
          // 如果启用了OCR且是图片文件，进行OCR识别
          if (this.data.enableOcr && /\.(jpg|jpeg|png)$/i.test(file.name)) {
            this.processOcr(uploadRes.fileID);
          } else {
            wx.hideLoading();
            pageHelper.showSuccToast('文件上传成功');
          }
        },
        fail: err => {
          wx.hideLoading();
          pageHelper.showModal('文件上传失败，请重试');
        }
      });
    },
    
    // 上传多个文件
    uploadMultipleFiles: async function() {
      if (this.data.reportFiles.length === 0) {
        pageHelper.showModal('请选择要上传的报告文件');
        return;
      }
      
      wx.showLoading({ title: '上传文件中...', mask: true });
      
      try {
        let fileIDs = [];
        let fileNames = [];
        
        // 逐个上传文件
        for (let i = 0; i < this.data.reportFiles.length; i++) {
          const file = this.data.reportFiles[i];
          wx.showLoading({ title: `上传第${i+1}/${this.data.reportFiles.length}个文件...`, mask: true });
          
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: 'health/report/' + Date.now() + '_' + file.name,
            filePath: file.path
          });
          
          fileIDs.push(uploadRes.fileID);
          fileNames.push(file.name);
        }
        
        this.setData({
          reportFileId: fileIDs.join(','),
          reportFileName: fileNames.join('; ')
        });
        
        wx.hideLoading();
        pageHelper.showSuccToast('文件上传成功');
      } catch (err) {
        wx.hideLoading();
        pageHelper.showModal('文件上传失败，请重试');
      }
    },
    
    // OCR识别处理
    processOcr: async function(fileID) {
      this.setData({ isOcrProcessing: true });
      try {
        wx.showLoading({ title: 'OCR识别中...', mask: true });
        
        // 调用OCR云函数
        const params = {
          action: 'ocrReport',
          params: { fileID }
        };
        
        const result = await cloudHelper.callCloudData('medicalReport', params);
        
        if (result && result.code === 0 && result.data) {
          this.setData({
            ocrResult: result.data.text,
            summary: result.data.summary || this.data.summary
          });
          pageHelper.showSuccToast('OCR识别成功');
        } else {
          pageHelper.showModal('OCR识别失败，请手动填写信息');
        }
      } catch (err) {
        pageHelper.showModal('OCR识别失败，请手动填写信息');
      } finally {
        this.setData({ isOcrProcessing: false });
        wx.hideLoading();
      }
    },
    
    // 关闭预览
    closePreview: function() {
      this.setData({
        previewMode: false,
        currentPreviewUrl: ''
      });
    },
    
    // 删除已上传文件
    deleteFile: function() {
      this.setData({
        reportFileId: '',
        reportFileName: '',
        ocrResult: ''
      });
      pageHelper.showSuccToast('已删除文件');
    },
    
    // 删除多文件中指定文件
    deleteMultipleFile: function(e) {
      const index = e.currentTarget.dataset.index;
      let reportFiles = this.data.reportFiles;
      reportFiles.splice(index, 1);
      this.setData({ reportFiles });
    },
    
    // 表单提交
    onSubmit: async function() {
      console.log('[onSubmit] 开始执行表单提交');
      // 如果是多文件模式且还没上传，先上传文件
      if (this.data.isMultipleFiles && this.data.reportFiles.length > 0 && !this.data.reportFileId) {
        console.log('[onSubmit] 多文件模式，开始上传文件');
        await this.uploadMultipleFiles();
        console.log('[onSubmit] 多文件上传完成，FileId:', this.data.reportFileId);
      }
      
      const { reportDate, hospital, reportType, summary, reportFileId } = this.data;
      const userId = wx.getStorageSync('openid') || '';
      
      console.log('[onSubmit] 当前表单数据:', { reportDate, hospital, reportType, summary, reportFileId, userId, reportFileName: this.data.reportFileName });

      if (!reportDate || !hospital || !reportType || !reportFileId) {
        console.warn('[onSubmit] 表单信息不完整');
        pageHelper.showModal('请填写完整信息并上传报告文件');
        return;
      }
      
      try {
        console.log('[onSubmit] 显示提交中Loading...');
        wx.showLoading({ title: '提交中...', mask: true });
        
        // 准备参数
        const paramsToCloud = {
          action: 'uploadReport',
          params: { 
            userId,
            reportDate,
            hospital,
            reportType,
            summary,
            reportFileId,
            reportFileName: this.data.reportFileName, // 确保传递reportFileName
            isMultipleFiles: this.data.isMultipleFiles
          }
        };
        console.log('[onSubmit] 准备调用云函数 (callCloudSumbitAsync)，参数:', JSON.stringify(paramsToCloud));
        
        // 使用callCloudSumbitAsync而不是callCloudData
        const result = await cloudHelper.callCloudSumbitAsync('medicalReport', paramsToCloud);

        console.log('[onSubmit] 云函数调用返回结果:', result);
        console.log('[onSubmit] 云函数返回结果类型 (typeof result):', typeof result);
        if (result) {
          console.log('[onSubmit] 云函数返回结果.code:', result.code);
          console.log('[onSubmit] 云函数返回结果.code 类型 (typeof result.code):', typeof result.code);
        }

        wx.hideLoading();
        console.log('[onSubmit] 关闭提交中Loading');
        
        if (result && result.code === 0) {
          console.log('[onSubmit] 云函数返回成功，result.code === 0');
          pageHelper.showSuccToast('上传成功');
          
          // 成功后询问是否要进行AI分析
          wx.showModal({
            title: '上传成功',
            content: '是否需要对报告进行AI智能分析？',
            confirmText: '进行分析',
            cancelText: '暂不需要',
            success: res => {
              console.log('[onSubmit] AI分析弹窗选择结果:', res);
              if (res.confirm) {
                console.log('[onSubmit] 用户选择进行AI分析，跳转到详情页，reportId:', result.data.reportId);
                wx.navigateTo({
                  url: `/projects/A00/health/report/report_detail/report_detail?id=${result.data.reportId}&analyze=true`
                });
              } else {
                console.log('[onSubmit] 用户选择暂不进行AI分析，返回上一页');
                setTimeout(() => wx.navigateBack(), 1000);
              }
            },
            fail: (err) => {
              console.error('[onSubmit] AI分析弹窗显示失败:', err);
              setTimeout(() => wx.navigateBack(), 1000); // 即使弹窗失败也尝试返回
            }
          });
        } else {
          console.error('[onSubmit] 云函数返回失败或result.code !== 0，显示上传失败提示。Result:', result);
          pageHelper.showModal( (result && result.msg) || '上传失败，请检查网络或联系管理员');
        }
      } catch (err) {
        wx.hideLoading();
        console.error('[onSubmit] 调用云函数或后续处理出现异常:', err);
        pageHelper.showModal('上传请求失败，请稍后重试');
      }
    }
  }
}); 