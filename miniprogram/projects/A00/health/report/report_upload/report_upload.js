let behavior = require('../../../../../behavior/report_upload_bh.js');
let PassportBiz = require('../../../../../biz/passport_biz.js');
let skin = require('../../../skin/skin.js');

Page({
  behaviors: [behavior],

  onReady: function () {
		PassportBiz.initPage({
			skin,
			that: this,
			isLoadSkin: true,
		});

		wx.setNavigationBarTitle({
			title: '上传报告'
		});
	},

  /**
   * 表单提交按钮点击事件
   */
  bindFormSubmit: function() {
    this.onSubmit();
  }
}) 