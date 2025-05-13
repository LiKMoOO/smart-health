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
    reportTypeOptions: ['常规体检', '年度体检', '健康证体检', '婚前体检', '糖尿病筛查', '心脑血管检查', '体检套餐', '其他'],
    ocrShowDetail: false, // 是否展示OCR识别详情
    ocrParsedFields: {} // OCR识别出的结构化字段
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
      
      // 如果关闭OCR，则清空OCR相关数据
      if (!this.data.enableOcr) {
        this.setData({
          ocrResult: '',
          ocrShowDetail: false,
          ocrParsedFields: {}
        });
      }
    },
    // 切换OCR详情显示
    toggleOcrDetail: function() {
      this.setData({
        ocrShowDetail: !this.data.ocrShowDetail
      });
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
          
          // 如果是第一个文件并且是图片文件，尝试OCR识别
          if (i === 0 && this.data.enableOcr && /\.(jpg|jpeg|png)$/i.test(file.name)) {
            await this.processOcr(uploadRes.fileID);
          }
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
      this.setData({ 
        isOcrProcessing: true,
        ocrResult: '正在进行OCR识别，请稍候...'
      });
      
      let retryCount = 0;
      const maxRetries = 2;
      
      const doOcrProcessing = async () => {
        try {
          wx.showLoading({ title: 'OCR智能识别中...', mask: true });
          
          // 调用OCR云函数
          const params = {
            action: 'ocrReport',
            params: { 
              fileID,
              userId: wx.getStorageSync('openid') || '' 
            }
          };
          
          console.log('准备调用OCR云函数，参数:', params);
          const result = await cloudHelper.callCloudData('medicalReport', params, { timeout: 15000 });
          console.log('OCR云函数返回结果:', result);
          
          if (result && result.code === 0 && result.data) {
            const ocrData = result.data;
            
            // 保存OCR识别结果和解析出的字段
            const ocrParsedFields = {
              hospital: ocrData.hospital || '',
              reportDate: ocrData.reportDate || '',
              reportType: ocrData.reportType || '',
              summary: ocrData.summary || ''
            };
            
            this.setData({
              ocrResult: ocrData.text || '未能识别到文本内容',
              ocrParsedFields
            });
            
            // 自动填充表单字段
            const formUpdate = {};
            
            // 只有当字段为空时，才自动填充
            if (!this.data.hospital && ocrParsedFields.hospital) {
              formUpdate.hospital = ocrParsedFields.hospital;
            }
            
            if (!this.data.summary && ocrParsedFields.summary) {
              formUpdate.summary = ocrParsedFields.summary;
            }
            
            // 报告日期，只有当是当天日期或者为空时才更新
            const today = timeHelper.time('Y-M-D');
            if ((this.data.reportDate === today || !this.data.reportDate) && ocrParsedFields.reportDate) {
              formUpdate.reportDate = ocrParsedFields.reportDate;
            }
            
            // 报告类型，需要匹配选项
            if (!this.data.reportType && ocrParsedFields.reportType) {
              const typeIndex = this.data.reportTypeOptions.findIndex(
                type => type === ocrParsedFields.reportType
              );
              
              if (typeIndex !== -1) {
                formUpdate.reportType = this.data.reportTypeOptions[typeIndex];
              }
            }
            
            // 应用自动填充
            if (Object.keys(formUpdate).length > 0) {
              this.setData(formUpdate);
              pageHelper.showNoneToast('OCR已自动填充识别出的信息');
            } else {
              pageHelper.showSuccToast('OCR识别完成');
            }
            
            return true; // 识别成功
          } else {
            throw new Error(result && result.msg ? result.msg : 'OCR识别失败');
          }
        } catch (err) {
          console.error('OCR识别出错:', err);
          
          // 检查是否为超时错误
          const isTimeoutError = err.message && (
            err.message.includes('timed out') || 
            err.message.includes('timeout') || 
            err.message.includes('TIME_LIMIT_EXCEEDED')
          );
          
          if (isTimeoutError && retryCount < maxRetries) {
            // 如果是超时错误并且未超过最大重试次数，则重试
            retryCount++;
            this.setData({
              ocrResult: `OCR识别超时，正在进行第${retryCount}次重试...`
            });
            
            // 等待1秒后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
            return false; // 需要重试
          } else {
            // 超过重试次数或其他错误
            this.setData({
              ocrResult: isTimeoutError ? 
                '由于图片处理时间较长，OCR识别超时。您可以手动填写信息或稍后再试。' : 
                '处理出错：' + (err.message || '未知错误')
            });
            
            // 显示错误信息
            const tipMsg = isTimeoutError ? 
              '图片处理超时，请尝试上传较小的图片，或手动填写信息。' : 
              'OCR识别失败，请手动填写信息。';
            
            pageHelper.showModal(tipMsg);
            return true; // 不再重试
          }
        } finally {
          wx.hideLoading();
        }
      };
      
      // 开始OCR识别流程
      let processingComplete = false;
      while (!processingComplete) {
        processingComplete = await doOcrProcessing();
      }
      
      this.setData({ isOcrProcessing: false });
    },
    
    // 应用OCR识别结果中的特定字段
    applyOcrField: function(e) {
      const field = e.currentTarget.dataset.field;
      if (!field || !this.data.ocrParsedFields[field]) return;
      
      const update = {};
      update[field] = this.data.ocrParsedFields[field];
      
      this.setData(update);
      pageHelper.showSuccToast(`已应用OCR识别的${field}信息`);
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
        ocrResult: '',
        ocrParsedFields: {},
        ocrShowDetail: false
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