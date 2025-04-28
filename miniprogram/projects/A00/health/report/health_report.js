// projects/A00/health/report/health_report.js
let behavior = require('../../../../behavior/health_report_bh.js');
let PassportBiz = require('../../../../biz/passport_biz.js');
let skin = require('../../skin/skin.js');

Page({
	behaviors: [behavior],
	
	onReady: function () {
		PassportBiz.initPage({
			skin,
			that: this,
			isLoadSkin: true,
		});

		wx.setNavigationBarTitle({
			title: '体检报告'
		});
	},
});