/**
 * Notes: 设置管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux@qq.com
 * Date: 2021-07-11 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const SetupModel = require('../../model/setup_model.js');
const config = require('../../../config/config.js');

class AdminSetupService extends BaseAdminService {


	/** 关于我们 */
	async setupAbout({
		about,
		aboutPic
	}) {
		// 参数校验
		if (!about) this.AppError('关于我们不能为空');
		
		// 查询是否存在设置
		let where = {};
		let setup = await SetupModel.getOne(where);
		
		// 处理aboutPic数组，确保是数组类型
		if (!Array.isArray(aboutPic)) aboutPic = aboutPic ? [aboutPic] : [];
		
		// 更新数据
		let data = {
			SETUP_ABOUT: about,
			SETUP_ABOUT_PIC: aboutPic
		};
		
		// 如果存在就更新，不存在就创建
		if (setup) {
			await SetupModel.edit(where, data);
		} else {
			data.SETUP_NAME = "系统设置";
			await SetupModel.insert(data);
		}
	}

	/** 联系我们设置 */
	async setupContact({
		address,
		phone,
		officePic,
		servicePic,
	}) {
		// 参数校验
		if (!address) this.AppError('地址不能为空');
		if (!phone) this.AppError('电话不能为空');
		
		// 查询是否存在设置
		let where = {};
		let setup = await SetupModel.getOne(where);
		
		// 处理图片数组，确保是数组类型
		if (!Array.isArray(officePic)) officePic = officePic ? [officePic] : [];
		if (!Array.isArray(servicePic)) servicePic = servicePic ? [servicePic] : [];
		
		// 更新数据
		let data = {
			SETUP_ADDRESS: address,
			SETUP_PHONE: phone,
			SETUP_OFFICE_PIC: officePic,
			SETUP_SERVICE_PIC: servicePic
		};
		
		// 如果存在就更新，不存在就创建
		if (setup) {
			await SetupModel.edit(where, data);
		} else {
			data.SETUP_NAME = "系统设置";
			await SetupModel.insert(data);
		}
	}

	/** 小程序码 */
	async genMiniQr() {
		//生成小程序qr buffer
		let cloud = cloudBase.getCloud();

		let page = "projects/" + this.getProjectId() + "/default/index/default_index";
		console.log(page);

		let result = await cloud.openapi.wxacode.getUnlimited({
			scene: 'qr',
			width: 280,
			check_path: false,
			env_version: 'release', //trial,develop
			page
		});

		let upload = await cloud.uploadFile({
			cloudPath: config.SETUP_PATH + 'qr.png',
			fileContent: result.buffer,
		});

		if (!upload || !upload.fileID) return;

		return upload.fileID;
	}

}

module.exports = AdminSetupService;