// projects/A00/health/profile/health_profile.js
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		profile: null,
		
		// 编辑状态
		editBasicInfo: false,
		editEmergencyContact: false,
		
		// 表单数据
		formBasicInfo: {},
		formEmergencyContact: {},
		formMedicalHistory: {},
		formAllergy: '',
		
		// 下拉选项
		genderOptions: ['男', '女'],
		genderIndex: 0,
		bloodTypeOptions: ['A型', 'B型', 'AB型', 'O型', '其他', '未知'],
		bloodTypeIndex: 0,
		
		// 弹窗状态
		showMedicalHistoryModal: false,
		showAllergyModal: false,
		
		// 编辑索引
		editMedicalHistoryIndex: null
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad(options) {
		this._loadData();
	},

	/**
	 * 获取用户健康档案数据
	 */
	async _loadData() {
		try {
			this.setData({ isLoad: false });

			// 获取健康档案数据
			const result = await cloudHelper.callCloudData('health/gethealthindex', {});
			let profile = result ? result.profile : null;
			
			// 如果没有档案数据，创建一个空结构
			if (!profile) {
				profile = {
					basicInfo: {
						height: '',
						weight: '',
						birthDate: '',
						gender: 'male',
						bloodType: 'unknown'
					},
					medicalHistory: [],
					allergies: [],
					emergencyContact: {
						name: '',
						relation: '',
						phone: ''
					}
				};
			} else {
				// 确保各个子对象存在，如果不存在则初始化为空结构，防止后续操作出错
				if (!profile.basicInfo) {
					profile.basicInfo = { height: '', weight: '', birthDate: '', gender: 'male', bloodType: 'unknown' };
				}
				if (!profile.medicalHistory) {
					profile.medicalHistory = [];
				}
				if (!profile.allergies) {
					profile.allergies = [];
				}
				if (!profile.emergencyContact) {
					profile.emergencyContact = { name: '', relation: '', phone: '' };
				}
			}
			
			// 设置性别索引
			let genderIndex = 0;
			if (profile.basicInfo.gender === 'female') {
				genderIndex = 1;
			}
			
			// 设置血型索引
			let bloodTypeIndex = 5;
			const bloodTypeMap = { 'A型': 0, 'B型': 1, 'AB型': 2, 'O型': 3, '其他': 4, '未知': 5 };
			const bloodTypeReverseMap = { 'A': 'A型', 'B': 'B型', 'AB': 'AB型', 'O': 'O型' };
			
			let dbBloodType = profile.basicInfo.bloodType;
			if(dbBloodType && bloodTypeReverseMap[dbBloodType]) {
				profile.basicInfo.bloodTypeDisplay = bloodTypeReverseMap[dbBloodType];
			} else if (dbBloodType && !Object.values(bloodTypeMap).includes(this.data.bloodTypeOptions.indexOf(dbBloodType))) {
				profile.basicInfo.bloodTypeDisplay = '其他';
			} else {
				profile.basicInfo.bloodTypeDisplay = dbBloodType || '未知';
			}

			bloodTypeIndex = this.data.bloodTypeOptions.indexOf(profile.basicInfo.bloodTypeDisplay);
			if (bloodTypeIndex === -1) bloodTypeIndex = 5;

			this.setData({
				isLoad: true,
				profile,
				genderIndex,
				bloodTypeIndex,
				formBasicInfo: { ...(profile.basicInfo || {}) },
				formEmergencyContact: { ...(profile.emergencyContact || {}) },
			});
		} catch (err) {
			console.error('加载健康档案数据失败', err);
			this.setData({ 
				isLoad: true,
				profile: {
					basicInfo: { height: '', weight: '', birthDate: '', gender: 'male', bloodType: 'unknown'},
					medicalHistory: [],
					allergies: [],
					emergencyContact: { name: '', relation: '', phone: '' }
				}
			});
			pageHelper.showNoneToast('加载失败，请稍后重试');
		}
	},

	/**
	 * 编辑基本信息
	 */
	onEditBasicInfo() {
		const currentProfile = this.data.profile || {};
		const formBasicInfo = { ...(currentProfile.basicInfo || { height: '', weight: '', birthDate: '', gender: 'male', bloodType: 'unknown'}) };
		const genderIndex = this.data.genderOptions.indexOf(formBasicInfo.gender === 'male' ? '男' : '女');
		const bloodTypeDisplay = formBasicInfo.bloodTypeDisplay || formBasicInfo.bloodType || '未知';
		const bloodTypeIndex = this.data.bloodTypeOptions.indexOf(bloodTypeDisplay);

		this.setData({
			editBasicInfo: true,
			formBasicInfo,
			genderIndex: genderIndex !== -1 ? genderIndex : 0,
			bloodTypeIndex: bloodTypeIndex !== -1 ? bloodTypeIndex : 5,
		});
	},

	/**
	 * 取消编辑基本信息
	 */
	onCancelBasicInfo() {
		this.setData({
			editBasicInfo: false
		});
	},

	/**
	 * 保存基本信息
	 */
	async onSaveBasicInfo() {
		const formBasicInfoToSave = { ...this.data.formBasicInfo };
		
		// 表单验证
		if (!formBasicInfoToSave.height) {
			return pageHelper.showModal('请输入身高');
		}
		if (!formBasicInfoToSave.weight) {
			return pageHelper.showModal('请输入体重');
		}
		if (!formBasicInfoToSave.birthDate) {
			return pageHelper.showModal('请选择出生日期');
		}

		// 将显示的血型转换为数据库存储的格式
		const selectedBloodTypeDisplay = this.data.bloodTypeOptions[this.data.bloodTypeIndex];
		if (selectedBloodTypeDisplay === 'A型') formBasicInfoToSave.bloodType = 'A';
		else if (selectedBloodTypeDisplay === 'B型') formBasicInfoToSave.bloodType = 'B';
		else if (selectedBloodTypeDisplay === 'AB型') formBasicInfoToSave.bloodType = 'AB';
		else if (selectedBloodTypeDisplay === 'O型') formBasicInfoToSave.bloodType = 'O';
		else if (selectedBloodTypeDisplay === '其他') formBasicInfoToSave.bloodType = '其他';
		else formBasicInfoToSave.bloodType = 'unknown';
		delete formBasicInfoToSave.bloodTypeDisplay;

		try {
			pageHelper.showLoading('保存中...');
			let updatedProfile = { ...this.data.profile };
			updatedProfile.basicInfo = formBasicInfoToSave;

			await cloudHelper.callCloudData('health/updatehealthdata', {
				dataType: 'profile',
				data: updatedProfile 
			});
			
			// 更新本地数据
			this.setData({
				profile: updatedProfile,
				editBasicInfo: false
			});
			pageHelper.showSuccToast('保存成功');
			getApp().globalData.refreshHealthIndex = true;

		} catch (err) {
			console.error('保存基本信息失败', err);
			pageHelper.showModal('保存失败，请重试');
		} finally {
			pageHelper.hideLoading();
		}
	},

	/**
	 * 基本信息表单输入处理
	 */
	onBasicInfoInput(e) {
		const { field } = e.currentTarget.dataset;
		let { formBasicInfo } = this.data;
		formBasicInfo[field] = e.detail.value;
		this.setData({ formBasicInfo });
	},

	/**
	 * 性别选择变化处理
	 */
	onGenderChange(e) {
		const genderIndex = e.detail.value;
		let { formBasicInfo } = this.data;
		formBasicInfo.gender = genderIndex == 0 ? 'male' : 'female';
		this.setData({
			genderIndex,
			formBasicInfo
		});
	},

	/**
	 * 血型选择变化处理
	 */
	onBloodTypeChange(e) {
		const bloodTypeIndex = e.detail.value;
		this.setData({
			bloodTypeIndex,
		});
	},

	/**
	 * 添加疾病史
	 */
	onAddMedicalHistory() {
		this.setData({
			showMedicalHistoryModal: true,
			formMedicalHistory: {},
			editMedicalHistoryIndex: null
		});
	},

	/**
	 * 编辑疾病史
	 */
	onEditMedicalHistory(e) {
		const index = e.currentTarget.dataset.index;
		const history = { ...this.data.profile.medicalHistory[index] };
		this.setData({
			showMedicalHistoryModal: true,
			formMedicalHistory: history,
			editMedicalHistoryIndex: index
		});
	},

	/**
	 * 删除疾病史
	 */
	onDeleteMedicalHistory(e) {
		const index = e.currentTarget.dataset.index;
		const that = this;
		
		wx.showModal({
			title: '提示',
			content: '确定要删除此病史记录吗？',
			success(res) {
				if (res.confirm) {
					let profile = { ...that.data.profile };
					profile.medicalHistory.splice(index, 1);
					that.setData({ profile });
					
					// 保存到云端
					cloudHelper.callCloudData('health/savehealthprofile', {
						medicalHistory: profile.medicalHistory
					}).then(() => {
					pageHelper.showSuccToast('删除成功');
					}).catch(err => {
						console.error('删除病史失败', err);
						pageHelper.showModal('删除失败，请重试');
					});
				}
			}
		});
	},

	/**
	 * 关闭疾病史弹窗
	 */
	onCloseMedicalHistoryModal() {
		this.setData({
			showMedicalHistoryModal: false
		});
	},

	/**
	 * 疾病史表单输入处理
	 */
	onMedicalHistoryInput(e) {
		const { field } = e.currentTarget.dataset;
		let { formMedicalHistory } = this.data;
		formMedicalHistory[field] = e.detail.value;
		this.setData({ formMedicalHistory });
	},

	/**
	 * 保存疾病史
	 */
	async onSaveMedicalHistory() {
		const { formMedicalHistory, editMedicalHistoryIndex, profile } = this.data;

		// 表单验证
		if (!formMedicalHistory.condition) {
			return pageHelper.showModal('请输入疾病名称');
		}

		try {
			pageHelper.showLoading('保存中...');
			let updatedProfile = JSON.parse(JSON.stringify(profile));
			if (!updatedProfile.medicalHistory) {
				updatedProfile.medicalHistory = [];
			}

			if (editMedicalHistoryIndex !== null) {
				// 编辑
				updatedProfile.medicalHistory[editMedicalHistoryIndex] = formMedicalHistory;
			} else {
				// 新增
				updatedProfile.medicalHistory.push(formMedicalHistory);
			}

			await cloudHelper.callCloudData('health/updatehealthdata', {
				dataType: 'profile',
				data: updatedProfile
			});

			this.setData({
				profile: updatedProfile,
				showMedicalHistoryModal: false,
				editMedicalHistoryIndex: null,
				formMedicalHistory: {} 
			});
			pageHelper.showSuccToast('保存成功');
			getApp().globalData.refreshHealthIndex = true;

		} catch (err) {
			console.error('保存既往病史失败', err);
			pageHelper.showModal('保存失败，请重试');
		} finally {
			pageHelper.hideLoading();
		}
	},

	/**
	 * 添加过敏原
	 */
	onAddAllergy() {
		this.setData({
			showAllergyModal: true,
			formAllergy: ''
		});
	},

	/**
	 * 删除过敏原
	 */
	onDeleteAllergy(e) {
		const index = e.currentTarget.dataset.index;
		const that = this;
		
		wx.showModal({
			title: '提示',
			content: '确定要删除此过敏原吗？',
			success(res) {
				if (res.confirm) {
					let profile = { ...that.data.profile };
					profile.allergies.splice(index, 1);
					
					// 保存到云端
					cloudHelper.callCloudData('health/savehealthprofile', {
						allergies: profile.allergies
					}).then(() => {
						// 更新后端字段结构
						profile.HEALTH_PROFILE_ALLERGIES = profile.allergies;
						
						that.setData({ profile });
					pageHelper.showSuccToast('删除成功');
					}).catch(err => {
						console.error('删除过敏原失败', err);
						pageHelper.showModal('删除失败，请重试');
					});
				}
			}
		});
	},

	/**
	 * 关闭过敏原弹窗
	 */
	onCloseAllergyModal() {
		this.setData({
			showAllergyModal: false
		});
	},

	/**
	 * 过敏原输入处理
	 */
	onAllergyInput(e) {
		this.setData({
			formAllergy: e.detail.value
		});
	},

	/**
	 * 保存过敏原
	 */
	async onSaveAllergy() {
		const { formAllergy, profile } = this.data;

		if (!formAllergy.trim()) {
			return pageHelper.showModal('请输入过敏物名称');
		}

		try {
			pageHelper.showLoading('保存中...');
			let updatedProfile = JSON.parse(JSON.stringify(profile));
			if (!updatedProfile.allergies) {
				updatedProfile.allergies = [];
			}
			updatedProfile.allergies.push(formAllergy.trim());

			await cloudHelper.callCloudData('health/updatehealthdata', {
				dataType: 'profile',
				data: updatedProfile
			});

			this.setData({
				profile: updatedProfile,
				showAllergyModal: false,
				formAllergy: ''
			});
			pageHelper.showSuccToast('保存成功');
			getApp().globalData.refreshHealthIndex = true;

		} catch (err) {
			console.error('保存过敏史失败', err);
			pageHelper.showModal('保存失败，请重试');
		} finally {
			pageHelper.hideLoading();
		}
	},

	/**
	 * 编辑紧急联系人
	 */
	onEditEmergencyContact() {
		const formEmergencyContact = { ...this.data.profile.emergencyContact };
		this.setData({
			editEmergencyContact: true,
			formEmergencyContact
		});
	},

	/**
	 * 取消编辑紧急联系人
	 */
	onCancelEmergencyContact() {
		this.setData({
			editEmergencyContact: false
		});
	},

	/**
	 * 紧急联系人表单输入处理
	 */
	onEmergencyContactInput(e) {
		const { field } = e.currentTarget.dataset;
		let { formEmergencyContact } = this.data;
		formEmergencyContact[field] = e.detail.value;
		this.setData({ formEmergencyContact });
	},

	/**
	 * 保存紧急联系人
	 */
	async onSaveEmergencyContact() {
		const { formEmergencyContact, profile } = this.data;

		// 表单验证
		if (!formEmergencyContact.name) {
			return pageHelper.showModal('请输入联系人姓名');
		}
		if (!formEmergencyContact.phone) {
			return pageHelper.showModal('请输入联系人电话');
		}
		if (!/^1[3-9]\d{9}$/.test(formEmergencyContact.phone)) {
			return pageHelper.showModal('请输入正确的手机号码');
		}

		try {
			pageHelper.showLoading('保存中...');
			let updatedProfile = { ...this.data.profile };
			updatedProfile.emergencyContact = { ...formEmergencyContact };

			await cloudHelper.callCloudData('health/updatehealthdata', {
				dataType: 'profile',
				data: updatedProfile
			});

			this.setData({
				profile: updatedProfile,
				editEmergencyContact: false
			});
			pageHelper.showSuccToast('保存成功');
			getApp().globalData.refreshHealthIndex = true;

		} catch (err) {
			console.error('保存紧急联系人失败', err);
			pageHelper.showModal('保存失败，请重试');
		} finally {
			pageHelper.hideLoading();
		}
	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh() {
		this._loadData();
		wx.stopPullDownRefresh();
	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom() {
		// 暂无实现
	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {
		return {
			title: '健康档案',
			path: '/projects/A00/health/profile/health_profile'
		};
	}
});