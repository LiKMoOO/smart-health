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
			this.setData({ isLoading: true });
			
			// 获取健康档案数据
			// const result = await cloudHelper.callCloudData('health/gethealthindex', {});
			// let profile = result.profile;
			
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
				// 确保基本信息转换为正确的格式
				if (profile.HEALTH_PROFILE_BASIC && typeof profile.HEALTH_PROFILE_BASIC === 'object') {
					profile.basicInfo = profile.HEALTH_PROFILE_BASIC;
				} else if (profile.HEALTH_PROFILE_BASIC && typeof profile.HEALTH_PROFILE_BASIC === 'string') {
					try {
						profile.basicInfo = JSON.parse(profile.HEALTH_PROFILE_BASIC);
					} catch (e) {
						profile.basicInfo = {};
					}
				} else {
					profile.basicInfo = {};
				}
				
				// 处理医疗病史
				if (profile.HEALTH_PROFILE_MEDICAL && Array.isArray(profile.HEALTH_PROFILE_MEDICAL)) {
					profile.medicalHistory = profile.HEALTH_PROFILE_MEDICAL;
				} else {
					profile.medicalHistory = [];
				}
				
				// 处理过敏信息
				if (profile.HEALTH_PROFILE_ALLERGIES && Array.isArray(profile.HEALTH_PROFILE_ALLERGIES)) {
					profile.allergies = profile.HEALTH_PROFILE_ALLERGIES;
				} else {
					profile.allergies = [];
				}
				
				// 处理紧急联系人
				if (profile.HEALTH_PROFILE_EMERGENCY && typeof profile.HEALTH_PROFILE_EMERGENCY === 'object') {
					profile.emergencyContact = profile.HEALTH_PROFILE_EMERGENCY;
				} else if (profile.HEALTH_PROFILE_EMERGENCY && typeof profile.HEALTH_PROFILE_EMERGENCY === 'string') {
					try {
						profile.emergencyContact = JSON.parse(profile.HEALTH_PROFILE_EMERGENCY);
					} catch (e) {
						profile.emergencyContact = {};
					}
				} else {
					profile.emergencyContact = {
					name: '',
					relation: '',
					phone: ''
				};
				}
			}
			
			// 设置性别索引
			let genderIndex = 0;
			if (profile.basicInfo.gender === 'female') {
				genderIndex = 1;
			}
			
			// 设置血型索引
			let bloodTypeIndex = 5; // 默认未知
			const bloodTypeMap = { 'A': 0, 'B': 1, 'AB': 2, 'O': 3 };
			if (bloodTypeMap[profile.basicInfo.bloodType] !== undefined) {
				bloodTypeIndex = bloodTypeMap[profile.basicInfo.bloodType];
			} else if (profile.basicInfo.bloodType) {
				bloodTypeIndex = 4; // 其他
			}
			
			this.setData({
				isLoad: true,
				profile,
				genderIndex,
				bloodTypeIndex
			});
		} catch (err) {
			console.error('加载健康档案数据失败', err);
			this.setData({ 
				isLoad: true,
				profile: {
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
				}
			});
			pageHelper.showNoneToast('加载健康档案数据失败，创建新档案');
		}
	},

	/**
	 * 编辑基本信息
	 */
	onEditBasicInfo() {
		const formBasicInfo = { ...this.data.profile.basicInfo };
		this.setData({
			editBasicInfo: true,
			formBasicInfo
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
		const formBasicInfo = this.data.formBasicInfo;
		
		// 表单验证
		if (!formBasicInfo.height) {
			return pageHelper.showModal('请输入身高');
		}
		if (!formBasicInfo.weight) {
			return pageHelper.showModal('请输入体重');
		}
		if (!formBasicInfo.birthDate) {
			return pageHelper.showModal('请选择出生日期');
		}
		
		try {
			// 通过云函数保存数据
			await cloudHelper.callCloudData('health/savehealthprofile', {
				basicInfo: formBasicInfo
			});
			
			// 更新本地数据
			let profile = { ...this.data.profile };
			profile.basicInfo = formBasicInfo;
			// 更新后端字段结构
			profile.HEALTH_PROFILE_BASIC = formBasicInfo;
			
			this.setData({
				profile,
				editBasicInfo: false
			});
			
			pageHelper.showSuccToast('保存成功');
		} catch (err) {
			console.error('保存基本信息失败', err);
			pageHelper.showModal('保存失败，请重试');
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
		let { formBasicInfo } = this.data;
		const bloodTypes = ['A', 'B', 'AB', 'O', 'other', 'unknown'];
		formBasicInfo.bloodType = bloodTypes[bloodTypeIndex];
		this.setData({
			bloodTypeIndex,
			formBasicInfo
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
	onSaveMedicalHistory() {
		const formMedicalHistory = this.data.formMedicalHistory;
		
		// 表单验证
		if (!formMedicalHistory.condition) {
			return pageHelper.showModal('请输入疾病名称');
		}
		
		let profile = { ...this.data.profile };
		const editIndex = this.data.editMedicalHistoryIndex;
		
		if (editIndex !== null) {
			// 更新现有病史
			profile.medicalHistory[editIndex] = formMedicalHistory;
		} else {
			// 添加新病史
			if (!profile.medicalHistory) profile.medicalHistory = [];
			profile.medicalHistory.push(formMedicalHistory);
		}
		
		// 保存到云端
		cloudHelper.callCloudData('health/savehealthprofile', {
			medicalHistory: profile.medicalHistory
		}).then(() => {
			// 更新本地数据结构
			profile.HEALTH_PROFILE_MEDICAL = profile.medicalHistory;
			
		this.setData({
			profile,
			showMedicalHistoryModal: false
		});
		pageHelper.showSuccToast('保存成功');
		}).catch(err => {
			console.error('保存病史失败', err);
			pageHelper.showModal('保存失败，请重试');
		});
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
	onSaveAllergy() {
		const allergy = this.data.formAllergy.trim();
		
		// 表单验证
		if (!allergy) {
			return pageHelper.showModal('请输入过敏原');
		}
		
		let profile = { ...this.data.profile };
		if (!profile.allergies) profile.allergies = [];
		
		// 检查是否已存在
		if (profile.allergies.includes(allergy)) {
			return pageHelper.showModal('该过敏原已存在');
		}
		
		profile.allergies.push(allergy);
		
		// 保存到云端
		cloudHelper.callCloudData('health/savehealthprofile', {
			allergies: profile.allergies
		}).then(() => {
			// 更新后端字段结构
			profile.HEALTH_PROFILE_ALLERGIES = profile.allergies;
			
		this.setData({
			profile,
			showAllergyModal: false
		});
			pageHelper.showSuccToast('添加成功');
		}).catch(err => {
			console.error('添加过敏原失败', err);
			pageHelper.showModal('添加失败，请重试');
		});
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
		const formEmergencyContact = this.data.formEmergencyContact;
		
		// 表单验证
		if (!formEmergencyContact.name) {
			return pageHelper.showModal('请输入联系人姓名');
		}
		if (!formEmergencyContact.phone) {
			return pageHelper.showModal('请输入联系人电话');
		}
		
		try {
			// 保存到云端
			await cloudHelper.callCloudData('health/savehealthprofile', {
				emergencyContact: formEmergencyContact
			});
			
			// 更新本地数据
			let profile = { ...this.data.profile };
			profile.emergencyContact = formEmergencyContact;
			// 更新后端字段结构
			profile.HEALTH_PROFILE_EMERGENCY = formEmergencyContact;
			
			this.setData({
				profile,
				editEmergencyContact: false
			});
			
			pageHelper.showSuccToast('保存成功');
		} catch (err) {
			console.error('保存紧急联系人失败', err);
			pageHelper.showModal('保存失败，请重试');
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