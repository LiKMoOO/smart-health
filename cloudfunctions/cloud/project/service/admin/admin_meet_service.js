/**
 * Notes: 预约后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY www.code3721.com
 * Date: 2021-12-08 07:48:00 
 */

const BaseAdminService = require('./base_admin_service.js');
const MeetService = require('../meet_service.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const util = require('../../../framework/utils/util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const cloudBase = require('../../../framework/cloud/cloud_base.js');

const MeetModel = require('../../model/meet_model.js');
const JoinModel = require('../../model/join_model.js');
const DayModel = require('../../model/day_model.js');
const config = require('../../../config/config.js');

class AdminMeetService extends BaseAdminService {

	/** 预约数据列表 */
	async getDayList(meetId, start, end) {
		let where = {
			DAY_MEET_ID: meetId,
			day: ['between', start, end]
		}
		let orderBy = {
			day: 'asc'
		}
		return await DayModel.getAllBig(where, 'day,times,dayDesc', orderBy);
	}

	// 按项目统计人数
	async statJoinCntByMeet(meetId) {
		let today = timeUtil.time('Y-M-D');
		let where = {
			day: ['>=', today],
			DAY_MEET_ID: meetId
		}

		let meetService = new MeetService();
		let list = await DayModel.getAllBig(where, 'DAY_MEET_ID,times', {}, 1000);
		for (let k in list) {
			let meetId = list[k].DAY_MEET_ID;
			let times = list[k].times;

			for (let j in times) {
				let timeMark = times[j].mark;
				meetService.statJoinCnt(meetId, timeMark);
			}
		}
	}

	/** 自助签到码 */
	async genSelfCheckinQr(page, timeMark) {
		let cloud = cloudBase.getCloud();
		
		// 签到码参数
		let params = {
			timeMark
		};
		
		// 生成小程序码
		let qrCode = await cloud.openapi.wxacode.getUnlimited({
			scene: JSON.stringify(params),
			width: 280,
			check_path: false,
			env_version: 'release', //release,trial
			page: page
		});
		
		// 上传到云存储
		let cloudPath = 'meet/checkin/' + timeMark + '.png';
		let upload = await cloud.uploadFile({
			cloudPath,
			fileContent: qrCode.buffer,
		});
		
		if (!upload || !upload.fileID) return '';
		
		// 获取临时访问地址
		let url = await cloudUtil.getTempFileURL(upload.fileID);
		return url;
	}

	/** 管理员按钮核销 */
	async checkinJoin(joinId, flag) {
		if (!joinId) this.AppError('预约记录不存在');
		
		let where = {
			_id: joinId,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		
		let join = await JoinModel.getOne(where);
		if (!join) this.AppError('预约记录不存在或者已经取消');
		
		// 更新状态
		let data = {
			JOIN_IS_CHECKIN: Number(flag)
		};
		
		await JoinModel.edit(where, data);
	}

	/** 管理员扫码核销 */
	async scanJoin(meetId, code) {
		if (!meetId) this.AppError('预约项目不存在');
		if (!code) this.AppError('签到码不能为空');
		
		// 查询预约记录
		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_CODE: code,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		
		let join = await JoinModel.getOne(where);
		if (!join) this.AppError('签到码错误或者已经签到，请联系管理员');
		
		// 更新状态
		let data = {
			JOIN_IS_CHECKIN: 1
		};
		
		await JoinModel.edit(where, data);
		
		// 返回记录以便显示
		return join;
	}

	/**
	 * 判断本日是否有预约记录
	 * @param {*} daySet daysSet的节点
	 */
	checkHasJoinCnt(times) {
		if (!times) return false;
		for (let k in times) {
			if (times[k].stat.succCnt) return true;
		}
		return false;
	}

	// 判断含有预约的日期
	getCanModifyDaysSet(daysSet) {
		let now = timeUtil.time('Y-M-D');

		for (let k in daysSet) {
			if (daysSet[k].day < now) continue;
			daysSet[k].hasJoin = this.checkHasJoinCnt(daysSet[k].times);
		}

		return daysSet;
	}

	/** 取消某个时间段的所有预约记录 */
	async cancelJoinByTimeMark(admin, meetId, timeMark, reason) {
		let meetService = new MeetService();
		let whereJoin = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: timeMark,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		};
		
		let joinList = await JoinModel.getAll(whereJoin);
		if (joinList.length == 0) return;
		
		let count = 0;
		for (let k in joinList) {
			let joinId = joinList[k]._id;
			let userJoin = joinList[k];
			
			let whereJoin = {
				_id: joinId,
				JOIN_STATUS: JoinModel.STATUS.SUCC
			};
			
			let ret = await JoinModel.edit(whereJoin, {
				JOIN_STATUS: JoinModel.STATUS.ADMIN_CANCEL,
				JOIN_EDIT_ADMIN_ID: admin.ADMIN_ID,
				JOIN_EDIT_ADMIN_NAME: admin.ADMIN_NAME,
				JOIN_EDIT_ADMIN_STATUS: JoinModel.STATUS.ADMIN_CANCEL,
				JOIN_EDIT_ADMIN_TIME: timeUtil.time(),
				JOIN_CANCEL_TIME: timeUtil.time(),
				JOIN_REASON: reason
			});
			
			// 记录日志
			if (ret) {
				count++;
				let logContent = '管理员取消用户预约记录，预约项目：' + userJoin.JOIN_MEET_TITLE + '，时间：' + userJoin.JOIN_MEET_DAY + ' ' + userJoin.JOIN_MEET_TIME_START + '～' + userJoin.JOIN_MEET_TIME_END + '，原因：' + reason;
				await this.insertLog(logContent, admin);
			}
		}
		
		// 统计
		await meetService.statJoinCnt(meetId, timeMark);
		
		return { count };
	}


	/**添加 */
	async insertMeet(adminId, {
		title,
		order,
		typeId,
		typeName,
		daysSet,
		isShowLimit,
		formSet,
	}) {
		// 判断是否存在
		let where = {
			MEET_TITLE: title,
			MEET_STATUS: ['in', [MeetModel.STATUS.COMM, MeetModel.STATUS.UNUSE]]
		}
		let cnt = await MeetModel.count(where);
		if (cnt > 0) this.AppError('该预约项目已存在');
		
		// 赋值
		let data = {};
		data.MEET_TITLE = title;
		data.MEET_ADMIN_ID = adminId;
		data.MEET_TYPE_ID = typeId;
		data.MEET_TYPE_NAME = typeName;
		data.MEET_ORDER = order;
		data.MEET_IS_SHOW_LIMIT = isShowLimit;
		data.MEET_DAYS = [];
		data.MEET_FORM_SET = formSet;
		
		let meetService = new MeetService();
		
		// 计算天数
		let dayCnt = 0;
		for (let k in daysSet) {
			if (daysSet[k].day) dayCnt++;
		}
		if (dayCnt == 0) this.AppError('请配置预约时间段');
		
		// 插入数据
		let id = await MeetModel.insert(data);
		
		// 增加日期设置
		await this._editDays(id, timeUtil.time('Y-M-D'), daysSet);
		
		return { id };
	}

	/**删除数据 */
	async delMeet(id) {
		// 判断是否存在
		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where);
		if (!meet) this.AppError('该预约不存在');
		
		// 查询是否有用户预约
		let whereJoin = {
			JOIN_MEET_ID: id,
			JOIN_STATUS: JoinModel.STATUS.SUCC
		}
		let cnt = await JoinModel.count(whereJoin);
		if (cnt > 0) this.AppError('该预约已有用户预约，不能删除');
		
		// 删除日期记录
		let whereDel = {
			DAY_MEET_ID: id
		}
		await DayModel.del(whereDel);
		
		// 删除预约记录
		await MeetModel.del(where);
	}

	/**获取信息 */
	async getMeetDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where, fields);
		if (!meet) return null;

		let meetService = new MeetService();
		meet.MEET_DAYS_SET = await meetService.getDaysSet(id, timeUtil.time('Y-M-D')); //今天及以后

		return meet;
	}

	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateMeetContent({
		meetId,
		content // 富文本数组
	}) {
		// 获取数据库里的原图片数据
		let meet = await MeetModel.getOne(meetId, 'MEET_CONTENT');
		if (!meet) this.AppError('该预约项目不存在');

		// 图片导出
		let imgList = [];
		for (let k in content) {
			let pic = content[k];
			if (pic.type == 'img') {
				// 图片类型才处理
				imgList.push(pic.val);
			}
		}
		
		// 更新数据
		let data = {};
		data.MEET_CONTENT = content;
		
		await MeetModel.edit(meetId, data);
		
		return { urls: imgList };
	}

	/**
	 * 更新封面内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateMeetStyleSet({
		meetId,
		styleSet
	}) {
		// 获取数据库里的原图片数据
		let meet = await MeetModel.getOne(meetId, 'MEET_STYLE_SET');
		if (!meet) this.AppError('该预约项目不存在');
		
		// 图片导出
		let imgList = [];
		imgList.push(styleSet.pic);
		
		// 更新数据
		let data = { MEET_STYLE_SET: styleSet };
		await MeetModel.edit(meetId, data);
		
		return { urls: imgList };
	}

	/** 更新日期设置 */
	async _editDays(meetId, nowDay, daysSetData) {
		let meetService = new MeetService();
		
		// 删除已有的日期设置
		let where = {
			DAY_MEET_ID: meetId
		}
		
		// 获取数据库里的老记录，以便计算更新
		let oldDaysSet = await meetService.getDaysSet(meetId, nowDay);
		
		let diffDay = [];
		for (let k in daysSetData) {
			let dayNode = daysSetData[k];
			let day = dayNode.day;
			if (day < nowDay) continue; // 忽略过期
			
			// 已有日期直接赋值
			diffDay.push(day);
			
			let hasDay = false;
			for (let j in oldDaysSet) {
				if (oldDaysSet[j].day == day) {
					hasDay = true;
					break;
				}
			}
			
			let data = {
				DAY_MEET_ID: meetId,
				day: dayNode.day,
				dayDesc: dayNode.dayDesc,
				times: this._getEditTimes(day, dayNode.times)
			};
			
			// 存在则更新，不存在则添加
			if (hasDay) {
				await DayModel.edit({ DAY_MEET_ID: meetId, day }, data);
			} else {
				await DayModel.insert(data);
			}
		}
		
		// 删除老的不存在的记录
		for (let j in oldDaysSet) {
			let day = oldDaysSet[j].day;
			if (!diffDay.includes(day)) {
				let where = {
					DAY_MEET_ID: meetId,
					day
				}
				await DayModel.del(where);
			}
		}
		
		// 更新预约表的日期
		let meetWhere = {
			_id: meetId
		}
		await MeetModel.edit(meetWhere, { MEET_DAYS: diffDay });
		
		return { ret: 'ok' };
	}
	
	// 获取更新时间段
	_getEditTimes(day, times) {
		let ret = [];
		
		for (let k in times) {
			let node = times[k];
			let nextNode = {
				mark: day.replace(/-/g, '') + '_' + node.start.replace(/:/g, '') + '_' + node.end.replace(/:/g, ''),
				start: node.start,
				end: node.end,
				isLimit: node.isLimit,
				limit: node.limit,
				status: node.status,
				stat: { succCnt: 0, cancelCnt: 0, adminCancelCnt: 0 },
			};
			ret.push(nextNode);
		}
		
		return ret;
	}

	/**更新数据 */
	async editMeet({
		id,
		title,
		typeId,
		typeName,
		order,
		daysSet,
		isShowLimit,
		formSet
	}) {
		// 判断是否存在
		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where);
		if (!meet) this.AppError('该预约不存在');
		
		// 修改数据
		let data = {};
		data.MEET_TITLE = title;
		data.MEET_TYPE_ID = typeId;
		data.MEET_TYPE_NAME = typeName;
		data.MEET_ORDER = order;
		data.MEET_IS_SHOW_LIMIT = isShowLimit;
		data.MEET_FORM_SET = formSet;
		
		// 判断时段是否有变化
		if (daysSet && daysSet.length > 0) {
			await this._editDays(id, timeUtil.time('Y-M-D'), daysSet);
		}
		
		await MeetModel.edit(where, data);
	}

	/**预约名单分页列表 */
	async getJoinList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		meetId,
		mark,
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'JOIN_EDIT_TIME': 'desc'
		};
		let fields = 'JOIN_IS_CHECKIN,JOIN_CODE,JOIN_ID,JOIN_REASON,JOIN_USER_ID,JOIN_MEET_ID,JOIN_MEET_TITLE,JOIN_MEET_DAY,JOIN_MEET_TIME_START,JOIN_MEET_TIME_END,JOIN_MEET_TIME_MARK,JOIN_FORMS,JOIN_STATUS,JOIN_EDIT_TIME';

		let where = {
			JOIN_MEET_ID: meetId,
			JOIN_MEET_TIME_MARK: mark
		};
		if (util.isDefined(search) && search) {
			where['JOIN_FORMS.val'] = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					sortVal = Number(sortVal);
					if (sortVal == 1099) //取消的2种
						where.JOIN_STATUS = ['in', [10, 99]]
					else
						where.JOIN_STATUS = Number(sortVal);
					break;
				case 'checkin':
					// 签到
					where.JOIN_STATUS = JoinModel.STATUS.SUCC;
					if (sortVal == 1) {
						where.JOIN_IS_CHECKIN = 1;
					} else {
						where.JOIN_IS_CHECKIN = 0;
					}
					break;
			}
		}

		return await JoinModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**预约项目分页列表 */
	async getMeetList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'MEET_ORDER': 'asc',
			'MEET_ADD_TIME': 'desc'
		};
		let fields = 'MEET_TYPE,MEET_TYPE_NAME,MEET_TITLE,MEET_STATUS,MEET_DAYS,MEET_ADD_TIME,MEET_EDIT_TIME,MEET_ORDER';

		let where = {};
		if (util.isDefined(search) && search) {
			where.MEET_TITLE = {
				$regex: '.*' + search,
				$options: 'i'
			};
		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'status':
					// 按类型
					where.MEET_STATUS = Number(sortVal);
					break;
				case 'typeId':
					// 按类型
					where.MEET_TYPE_ID = sortVal;
					break;
				case 'sort':
					// 排序
					if (sortVal == 'view') {
						orderBy = {
							'MEET_VIEW_CNT': 'desc',
							'MEET_ADD_TIME': 'desc'
						};
					}

					break;
			}
		}

		return await MeetModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/** 删除 */
	async delJoin(joinId) {
		// 判断预约是否存在
		let where = {
			_id: joinId
		}
		let join = await JoinModel.getOne(where);
		if (!join) this.AppError('该预约记录不存在');
		
		// 删除预约
		await JoinModel.del(where);
		
		// 更新时段统计
		let meetService = new MeetService();
		await meetService.statJoinCnt(join.JOIN_MEET_ID, join.JOIN_MEET_TIME_MARK);
	}

	/**修改报名状态 
	 * 特殊约定 99=>正常取消 
	 */
	async statusJoin(admin, joinId, status, reason = '') {
		// 判断预约是否存在
		let where = {
			_id: joinId
		}
		let join = await JoinModel.getOne(where);
		if (!join) this.AppError('该预约记录不存在');
		
		// 修改状态
		let data = {
			JOIN_STATUS: status,
			JOIN_EDIT_ADMIN_ID: admin.ADMIN_ID,
			JOIN_EDIT_ADMIN_NAME: admin.ADMIN_NAME,
			JOIN_EDIT_ADMIN_STATUS: status,
			JOIN_EDIT_ADMIN_TIME: timeUtil.time(),
			JOIN_REASON: reason,
		}
		
		if (status == 99) data.JOIN_CANCEL_TIME = timeUtil.time(); // 取消的情况下
		
		await JoinModel.edit(where, data);
		
		// 更新时段统计
		let meetService = new MeetService();
		await meetService.statJoinCnt(join.JOIN_MEET_ID, join.JOIN_MEET_TIME_MARK);
	}

	/**修改项目状态 */
	async statusMeet(id, status) {
		// 判断是否存在
		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where);
		if (!meet) this.AppError('该预约项目不存在');
		
		// 修改状态
		let data = {
			MEET_STATUS: status
		}
		await MeetModel.edit(where, data);
	}

	/**置顶排序设定 */
	async sortMeet(id, sort) {
		// 判断是否存在
		let where = {
			_id: id
		}
		let meet = await MeetModel.getOne(where);
		if (!meet) this.AppError('该预约项目不存在');
		
		// 修改排序
		let data = {
			MEET_ORDER: sort
		}
		await MeetModel.edit(where, data);
	}
}

module.exports = AdminMeetService;