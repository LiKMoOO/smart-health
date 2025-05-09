// projects/A00/health/profile/health_profile.js
const pageHelper = require('../../../../helper/page_helper.js');
const cloudHelper = require('../../../../helper/cloud_helper.js');

Page({
	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		profile: { // 初始化 profile 结构，确保子对象存在且 medicalHistory 和 allergies 为数组
			basicInfo: { height: '', weight: '', birthDate: '', gender: 'male', bloodType: 'unknown', bloodTypeDisplay: '未知' },
			medicalHistory: [],
			allergies: [],
			emergencyContact: { name: '', relation: '', phone: '' }
		},
		
		// 编辑状态
		editBasicInfo: false,
		editEmergencyContact: false,
		
		// 表单数据
		formBasicInfo: {}, // 会在 _loadData 或 onEditBasicInfo 中根据 profile.basicInfo 初始化
		formEmergencyContact: {}, // 会在 _loadData 或 onEditEmergencyContact 中根据 profile.emergencyContact 初始化
		
		// --- 既往病史 ---
		showMedicalHistoryModal: false,
		formMedicalHistory: { condition: '', diagnosisDate: '', notes: '' }, // 新增/编辑时的表单
		editMedicalHistoryIndex: null, // null 表示添加, 数字表示编辑的索引

		// --- 过敏史 ---
		showAllergyModal: false,
		formAllergy: '', // 新增时的表单 (过敏物名称字符串)
		
		// 下拉选项
		genderOptions: ['男', '女'],
		genderIndex: 0, // 默认为 '男'
		bloodTypeOptions: ['A型', 'B型', 'AB型', 'O型', '其他', '未知'],
		bloodTypeIndex: 5, // 默认为 '未知'
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
			const result = await cloudHelper.callCloudData('health/gethealthindex', {});
			let serverProfile = result ? result.profile : null;
			
			let localProfile = { // 创建一个本地的、结构完整的 profile 对象
				basicInfo: { height: '', weight: '', birthDate: '', gender: 'male', bloodType: 'unknown', bloodTypeDisplay: '未知' },
				medicalHistory: [],
				allergies: [],
				emergencyContact: { name: '', relation: '', phone: '' }
			};

			if (serverProfile) {
				// 合并 basicInfo
				if (serverProfile.basicInfo && typeof serverProfile.basicInfo === 'object') {
					localProfile.basicInfo = { ...localProfile.basicInfo, ...serverProfile.basicInfo };
				}
				// 合并 medicalHistory, 确保是数组
				if (Array.isArray(serverProfile.medicalHistory)) {
					localProfile.medicalHistory = serverProfile.medicalHistory;
				}
				// 合并 allergies, 确保是数组
				if (Array.isArray(serverProfile.allergies)) {
					localProfile.allergies = serverProfile.allergies;
				}
				// 合并 emergencyContact
				if (serverProfile.emergencyContact && typeof serverProfile.emergencyContact === 'object') {
					localProfile.emergencyContact = { ...localProfile.emergencyContact, ...serverProfile.emergencyContact };
				}
			}
			
			// 处理性别和血型显示
			let genderIndex = this.data.genderOptions.indexOf(localProfile.basicInfo.gender === 'male' ? '男' : '女');
			if (genderIndex === -1) genderIndex = 0; // 默认男
			
			let bloodTypeIndex = 5; // 默认未知
			const bloodTypeReverseMap = { 'A': 'A型', 'B': 'B型', 'AB': 'AB型', 'O': 'O型' };
			let dbBloodType = localProfile.basicInfo.bloodType; // 从数据库读取的 'A', 'B', 'unknown' 等
			let bloodTypeDisplayValue = '未知';

			if (dbBloodType) {
				if (bloodTypeReverseMap[dbBloodType]) { // A, B, AB, O
					bloodTypeDisplayValue = bloodTypeReverseMap[dbBloodType];
				} else if (this.data.bloodTypeOptions.includes(dbBloodType)) { // 本身就是 'A型', '其他', '未知'
					bloodTypeDisplayValue = dbBloodType;
				} else { // 其他无法识别的，归为 '其他'
					bloodTypeDisplayValue = '其他';
				}
			}
			localProfile.basicInfo.bloodTypeDisplay = bloodTypeDisplayValue; // 用于WXML显示
			bloodTypeIndex = this.data.bloodTypeOptions.indexOf(bloodTypeDisplayValue);
			if (bloodTypeIndex === -1) bloodTypeIndex = 5; // 未找到则为'未知'


			this.setData({
				isLoad: true,
				profile: localProfile,
				genderIndex,
				bloodTypeIndex,
				formBasicInfo: { ...localProfile.basicInfo }, // 初始化表单
				formEmergencyContact: { ...localProfile.emergencyContact } // 初始化表单
			});
		} catch (err) {
			console.error('加载健康档案数据失败', err);
			this.setData({ 
				isLoad: true, // 即使失败，也允许用户交互（例如创建新档案）
				// profile 保持 data 中的初始空结构
			});
			pageHelper.showNoneToast('加载数据失败，请稍后重试或完善档案');
		}
	},

	// --- 通用保存 Profile 的辅助函数 ---
	async _saveProfile(updatedProfile, successMsg = '保存成功') {
		try {
			pageHelper.showLoading('保存中...');
			// 在实际发送前，确保 updatedProfile 内 basicInfo 的 bloodType 是 A/B/O/AB/other/unknown 格式
			if (updatedProfile.basicInfo && updatedProfile.basicInfo.bloodTypeDisplay) {
				const display = updatedProfile.basicInfo.bloodTypeDisplay;
				if (display === 'A型') updatedProfile.basicInfo.bloodType = 'A';
				else if (display === 'B型') updatedProfile.basicInfo.bloodType = 'B';
				else if (display === 'AB型') updatedProfile.basicInfo.bloodType = 'AB';
				else if (display === 'O型') updatedProfile.basicInfo.bloodType = 'O';
				else if (display === '其他') updatedProfile.basicInfo.bloodType = '其他'; // 或者 'other'
				else updatedProfile.basicInfo.bloodType = 'unknown';
			}

			await cloudHelper.callCloudData('health/updatehealthdata', {
				dataType: 'profile',
				data: updatedProfile
			});
			this.setData({ profile: updatedProfile }); // 保存成功后，用更新后的profile更新本地
			pageHelper.showSuccToast(successMsg);
			if (typeof getApp === 'function' && getApp().globalData) {
				getApp().globalData.refreshHealthIndex = true;
			}
			return true; // 表示成功
		} catch (err) {
			console.error('更新档案失败:', err);
			pageHelper.showModal('更新失败，请重试');
			// throw err; // 可以选择不向上抛出，因为已经提示用户
			return false; // 表示失败
		} finally {
			pageHelper.hideLoading();
		}
	},

	// --- 基本信息模块 ---
	onEditBasicInfo() {
		const currentProfile = this.data.profile || {};
		const formBasicInfo = { ...(currentProfile.basicInfo || this.data.profile.basicInfo) }; // 使用 data 中已正确初始化的 profile.basicInfo
		
		let genderIndex = this.data.genderOptions.indexOf(formBasicInfo.gender === 'male' ? '男' : '女');
		if (genderIndex === -1) genderIndex = 0;

		let bloodTypeDisplay = formBasicInfo.bloodTypeDisplay || '未知';
		let bloodTypeIndex = this.data.bloodTypeOptions.indexOf(bloodTypeDisplay);
		if (bloodTypeIndex === -1) bloodTypeIndex = 5;

		this.setData({
			editBasicInfo: true,
			formBasicInfo, // 表单数据为当前档案的基本信息
			genderIndex,
			bloodTypeIndex,
		});
	},

	onCancelBasicInfo() {
		this.setData({ editBasicInfo: false });
	},

	async onSaveBasicInfo() {
		const formBasicInfoToSave = { ...this.data.formBasicInfo };
		if (!formBasicInfoToSave.height) return pageHelper.showModal('请输入身高');
		if (parseFloat(formBasicInfoToSave.height) <=0 || parseFloat(formBasicInfoToSave.height) > 300) return pageHelper.showModal('请输入有效身高');
		if (!formBasicInfoToSave.weight) return pageHelper.showModal('请输入体重');
		if (parseFloat(formBasicInfoToSave.weight) <=0 || parseFloat(formBasicInfoToSave.weight) > 500) return pageHelper.showModal('请输入有效体重');
		if (!formBasicInfoToSave.birthDate) return pageHelper.showModal('请选择出生日期');

		// gender 已经在 onGenderChange 中直接修改了 formBasicInfo.gender
		// bloodType 将在 _saveProfile 中根据 bloodTypeDisplay 处理

		let updatedProfile = JSON.parse(JSON.stringify(this.data.profile));
		updatedProfile.basicInfo = { ...updatedProfile.basicInfo, ...formBasicInfoToSave }; // 合并，而不是完全替换，保留 bloodTypeDisplay 等
		
		// 从 form picker 获取的 bloodTypeDisplay 来更新 profile.basicInfo.bloodTypeDisplay
		updatedProfile.basicInfo.bloodTypeDisplay = this.data.bloodTypeOptions[this.data.bloodTypeIndex];


		if (await this._saveProfile(updatedProfile)) {
			this.setData({ editBasicInfo: false }); 
		}
	},

	onBasicInfoInput(e) {
		const { field } = e.currentTarget.dataset;
		let value = e.detail.value;
		this.setData({
			[`formBasicInfo.${field}`]: value
		});
	},

	onGenderChange(e) {
		const genderIndex = parseInt(e.detail.value, 10);
		this.setData({
			genderIndex,
			'formBasicInfo.gender': genderIndex === 0 ? 'male' : 'female'
		});
	},

	onBloodTypeChange(e) {
		const bloodTypeIndex = parseInt(e.detail.value, 10);
		this.setData({
			bloodTypeIndex,
			// 'formBasicInfo.bloodTypeDisplay': this.data.bloodTypeOptions[bloodTypeIndex] // 更新到 formBasicInfo.bloodTypeDisplay
		});
	},

	// --- 既往病史模块 ---
	onAddMedicalHistory() { // WXML bindtap="onAddMedicalHistory"
		this.setData({
			showMedicalHistoryModal: true,
			editMedicalHistoryIndex: null,
			formMedicalHistory: { condition: '', diagnosisDate: '', notes: '' } 
		});
	},

	onEditMedicalHistory(e) { // WXML bindtap="onEditMedicalHistory"
		const index = e.currentTarget.dataset.index;
		const medicalRecord = this.data.profile.medicalHistory[index];
		if (medicalRecord) {
			this.setData({
				showMedicalHistoryModal: true,
				editMedicalHistoryIndex: index,
				formMedicalHistory: { ...medicalRecord } 
			});
		}
	},

	onCloseMedicalHistoryModal() { // WXML bindtap="onCloseMedicalHistoryModal"
		this.setData({ showMedicalHistoryModal: false });
	},

	onMedicalHistoryInput(e) { // WXML bindinput="onMedicalHistoryInput"
		const field = e.currentTarget.dataset.field;
		this.setData({
			[`formMedicalHistory.${field}`]: e.detail.value
		});
	},

	async onSaveMedicalHistory() { // WXML bindtap="onSaveMedicalHistory"
		const { formMedicalHistory, editMedicalHistoryIndex, profile } = this.data;
		if (!formMedicalHistory.condition || !formMedicalHistory.condition.trim()) {
			return pageHelper.showModal('请输入疾病名称');
		}

		let updatedProfile = JSON.parse(JSON.stringify(profile));
		if (!Array.isArray(updatedProfile.medicalHistory)) {
			updatedProfile.medicalHistory = [];
		}

		if (editMedicalHistoryIndex !== null) {
			updatedProfile.medicalHistory[editMedicalHistoryIndex] = formMedicalHistory;
		} else {
			updatedProfile.medicalHistory.push(formMedicalHistory);
		}

		if (await this._saveProfile(updatedProfile)) {
			this.onCloseMedicalHistoryModal();
		}
	},

	async onDeleteMedicalHistory(e) { // WXML bindtap="onDeleteMedicalHistory"
		const index = e.currentTarget.dataset.index;
		wx.showModal({
			title: '提示',
			content: '确定要删除此病史记录吗？',
			success: async (res) => {
				if (res.confirm) {
					let updatedProfile = JSON.parse(JSON.stringify(this.data.profile));
					if (updatedProfile.medicalHistory && updatedProfile.medicalHistory.length > index) {
						updatedProfile.medicalHistory.splice(index, 1);
						await this._saveProfile(updatedProfile, '删除成功');
					}
				}
			}
		});
	},

	// --- 过敏史模块 ---
	onAddAllergy() { // WXML bindtap="onAddAllergy"
		this.setData({
			showAllergyModal: true,
			formAllergy: '' 
		});
	},

	onCloseAllergyModal() { // WXML bindtap="onCloseAllergyModal"
		this.setData({ showAllergyModal: false });
	},

	onAllergyInput(e) { // WXML bindinput="onAllergyInput"
		this.setData({
			formAllergy: e.detail.value
		});
	},

	async onSaveAllergy() { // WXML bindtap="onSaveAllergy"
		const { formAllergy, profile } = this.data;
		const allergyName = formAllergy.trim();
		if (!allergyName) {
			return pageHelper.showModal('请输入过敏物名称');
		}

		let updatedProfile = JSON.parse(JSON.stringify(profile));
		if (!Array.isArray(updatedProfile.allergies)) {
			updatedProfile.allergies = [];
		}
		
		if (updatedProfile.allergies.includes(allergyName)) {
			return pageHelper.showModal('该过敏物已存在');
		}
		updatedProfile.allergies.push(allergyName);

		if (await this._saveProfile(updatedProfile)) {
			this.onCloseAllergyModal();
		}
	},

	async onDeleteAllergy(e) { // WXML bindtap="onDeleteAllergy"
		const index = e.currentTarget.dataset.index;
		wx.showModal({
			title: '提示',
			content: '确定要删除此过敏史记录吗？',
			success: async (res) => {
				if (res.confirm) {
					let updatedProfile = JSON.parse(JSON.stringify(this.data.profile));
					if (updatedProfile.allergies && updatedProfile.allergies.length > index) {
						updatedProfile.allergies.splice(index, 1);
						await this._saveProfile(updatedProfile, '删除成功');
					}
				}
			}
		});
	},

	// --- 紧急联系人模块 ---
	onEditEmergencyContact() {
		const currentProfile = this.data.profile || {};
		this.setData({
			editEmergencyContact: true,
			formEmergencyContact: { ...(currentProfile.emergencyContact || this.data.profile.emergencyContact) }
		});
	},

	onCancelEmergencyContact() {
		this.setData({ editEmergencyContact: false });
	},
	
	onEmergencyContactInput(e) {
		const { field } = e.currentTarget.dataset;
		this.setData({
			[`formEmergencyContact.${field}`]: e.detail.value
		});
	},

	async onSaveEmergencyContact() {
		const { formEmergencyContact } = this.data;
		if (!formEmergencyContact.name || !formEmergencyContact.name.trim()) return pageHelper.showModal('请输入联系人姓名');
		if (!formEmergencyContact.phone || !formEmergencyContact.phone.trim()) return pageHelper.showModal('请输入联系人电话');
		if (!/^1[3-9]\d{9}$/.test(formEmergencyContact.phone)) return pageHelper.showModal('请输入正确的手机号码');

		let updatedProfile = JSON.parse(JSON.stringify(this.data.profile));
		updatedProfile.emergencyContact = { ...formEmergencyContact };

		if (await this._saveProfile(updatedProfile)) {
			this.setData({ editEmergencyContact: false });
		}
	},
	
	// --- 页面事件 ---
	onPullDownRefresh() {
		this._loadData().finally(() => wx.stopPullDownRefresh());
	},

	onShareAppMessage() {
		return {
			title: '健康档案',
			path: '/projects/A00/health/profile/health_profile'
		};
	}
})