/**
 * TriGyna Centralized Staff Onboarding Service
 * Admin-controlled onboarding for Doctors and Sales Team with 100% Online-Only Architecture.
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../users/user.model");
const Employee = require("../hrms/employee.model");
const Doctor = require("../doctors/doctor.model");
const SalesTeamMember = require("../sales-team/sales-team-member.model");
const StaffInvitation = require("./staff-invitation.model");
const StaffOnboarding = require("./staff-onboarding.model");
const emailService = require("../notifications/email.service");
const whatsappService = require("../integrations/whatsapp.service");
const { recordAudit } = require("../audit/audit.service");
const { ValidationError, NotFoundError, ConflictError, ForbiddenError } = require("../../shared/errors");
const { ONBOARDING_STATUS } = require("../../shared/consultation.constants");

class StaffOnboardingService {
  /**
   * Helper to normalize phone numbers
   */
  normalizePhone(phone) {
    if (!phone) return "";
    let clean = String(phone).replace(/\D/g, "");
    if (clean.length === 12 && clean.startsWith("91")) clean = clean.slice(2);
    if (clean.length === 11 && clean.startsWith("0")) clean = clean.slice(1);
    return clean;
  }

  /**
   * Generates a deterministic or atomic unique Employee Code
   */
  async generateUniqueEmployeeCode(role) {
    const prefix = role === "doctor" ? "EMP-DOC" : "EMP-SAL";
    const count = await Employee.countDocuments({
      employeeCode: new RegExp(`^${prefix}-`),
    });
    const codeNumber = 1001 + count;
    let candidate = `${prefix}-${codeNumber}`;

    // Verify collision safety
    let exists = await Employee.findOne({ employeeCode: candidate });
    let counter = 1;
    while (exists) {
      candidate = `${prefix}-${codeNumber + counter}`;
      exists = await Employee.findOne({ employeeCode: candidate });
      counter++;
    }
    return candidate;
  }

  /**
   * Step 1 & 2: Onboard Staff Member (Doctor or Sales)
   */
  async onboardStaff({ adminUser, staffData }) {
    if (!adminUser || !["owner", "admin", "super_admin"].includes(adminUser.role)) {
      throw new ForbiddenError("Only authorized Admin or Owner users can onboard staff members");
    }

    const {
      role,
      name,
      email,
      phone,
      department,
      designation,
      joiningDate,
      // Doctor-specific fields
      qualifications,
      specialization,
      registrationNumber,
      registrationCouncil,
      experienceYears,
      bio,
      consultationFee,
      isVerified,
      // Sales-specific fields
      salesRole,
      monthlyTarget,
    } = staffData;

    // Validate role
    if (!role || !["doctor", "sales"].includes(role)) {
      throw new ValidationError("Staff onboarding only supports 'doctor' or 'sales' roles");
    }

    if (!name || !name.trim()) {
      throw new ValidationError("Staff full name is required");
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new ValidationError("A valid work email address is required");
    }

    const cleanPhone = this.normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new ValidationError("A valid 10-digit mobile phone number is required");
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check for duplicate User
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });
    if (existingUser) {
      throw new ConflictError(
        `A user account already exists with this ${existingUser.email === cleanEmail ? "email" : "phone number"}`
      );
    }

    // Role-specific validation
    if (role === "doctor") {
      if (!registrationNumber || !registrationNumber.trim()) {
        throw new ValidationError("Professional medical registration number is required for doctor onboarding");
      }
    }

    // Determine Employee Code
    const employeeCode = staffData.employeeCode
      ? staffData.employeeCode.trim()
      : await this.generateUniqueEmployeeCode(role);

    const existingEmpCode = await Employee.findOne({ employeeCode });
    if (existingEmpCode) {
      throw new ConflictError(`Employee code '${employeeCode}' is already assigned`);
    }

    // Create User record with temporary unguessable password hash (login disabled until activated)
    const randomTemporaryPassword = crypto.randomBytes(32).toString("hex") + "!Tg9";
    const passwordHash = await User.hashPassword(randomTemporaryPassword);

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      role,
      status: "invited", // Not active until activation link is consumed
      createdBy: adminUser._id,
    });

    // Create Employee record
    const newEmployee = await Employee.create({
      userId: newUser._id,
      employeeCode,
      department: department || (role === "doctor" ? "Clinical" : "CRM"),
      designation: designation || (role === "doctor" ? "Consultant Physician" : "Sales Specialist"),
      employmentType: "full_time",
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      status: "active",
      salary: staffData.salary || 0,
    });

    newUser.employeeId = newEmployee._id;

    let doctorProfile = null;
    let salesMemberProfile = null;

    if (role === "doctor") {
      // Professional registration verification gate:
      // If Admin explicitly verifies during onboarding, verificationStatus = "verified", otherwise "pending"
      const verified = Boolean(isVerified);
      doctorProfile = await Doctor.create({
        userId: newUser._id,
        qualifications: qualifications ? qualifications.trim() : "BHMS, MD (Consultant Homoeopath)",
        specialization: Array.isArray(specialization) && specialization.length > 0 ? specialization : ["Homoeopathy", "Women's Wellness"],
        registrationNumber: registrationNumber.trim(),
        registrationCouncil: registrationCouncil ? registrationCouncil.trim() : "National Medical Commission",
        experienceYears: experienceYears ? experienceYears.trim() : "5+ Years",
        bio: bio ? bio.trim() : "",
        consultationFee: consultationFee ? Number(consultationFee) : 500,
        consultationModes: ["Online Video Consultation"],
        supportedVideoProviders: ["google_meet", "zoom"],
        isVerified: verified,
        verificationStatus: verified ? "verified" : "pending",
        verifiedAt: verified ? new Date() : null,
        verifiedBy: verified ? adminUser._id : null,
        status: "active",
      });

      newUser.doctorId = doctorProfile._id;
    } else if (role === "sales") {
      salesMemberProfile = await SalesTeamMember.create({
        userId: newUser._id,
        employeeId: newEmployee._id,
        salesRole: salesRole || "Sales Executive",
        monthlyTarget: monthlyTarget ? Number(monthlyTarget) : 30,
        membershipStatus: "active",
      });
    }

    await newUser.save();

    // Step 3: Generate Cryptographically Secure Activation Token (48h)
    const { rawToken, tokenHash, expiresAt } = StaffInvitation.generateSecureToken(48);

    await StaffInvitation.create({
      userId: newUser._id,
      employeeId: newEmployee._id,
      role,
      tokenHash,
      expiresAt,
      invitationStatus: "pending",
      createdBy: adminUser._id,
    });

    // Step 4: Create Tracking Record in StaffOnboarding
    const onboardingRecord = await StaffOnboarding.create({
      userId: newUser._id,
      employeeId: newEmployee._id,
      employeeCode,
      role,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      onboardingStatus: ONBOARDING_STATUS.INVITATION_QUEUED,
      emailStatus: "pending",
      whatsappStatus: "pending",
      createdBy: adminUser._id,
    });

    // Step 5: Send Multi-Channel Notifications (Email & WhatsApp)
    const frontendBaseUrl = (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
    const activationUrl = `${frontendBaseUrl}/activate-account?token=${rawToken}`;
    const loginUrl = `${frontendBaseUrl}/login`;

    // 5a. Email Notification
    try {
      const emailResult = await emailService.sendEmail({
        to: newUser.email,
        templateId: "staff_onboarding_invitation",
        data: {
          name: newUser.name,
          role,
          employeeCode,
          department: newEmployee.department,
          activationUrl,
          portalUrl: loginUrl,
        },
      });
      onboardingRecord.emailStatus = "sent";
      onboardingRecord.emailProviderMessageId = emailResult?.messageId || "sent";
    } catch (emailErr) {
      console.warn("[Staff Onboarding] Email dispatch warning:", emailErr.message);
      onboardingRecord.emailStatus = "failed";
      onboardingRecord.lastEmailError = emailErr.message;
    }

    // 5b. WhatsApp Notification (Meta Cloud API) - NEVER contains password or token!
    try {
      const waResult = await whatsappService.sendStaffOnboardingNotification({
        to: newUser.phone,
        name: newUser.name,
        role,
        employeeCode,
        portalUrl: loginUrl,
        idempotencyKey: `staff_onboard_${newUser._id}_${Date.now()}`,
        initiator: { type: "admin", userId: adminUser._id },
      });
      onboardingRecord.whatsappStatus = waResult?.success ? "sent" : "queued";
      onboardingRecord.whatsappProviderMessageId = waResult?.messages?.[0]?.id || waResult?.messageId || "sent";
    } catch (waErr) {
      console.warn("[Staff Onboarding] WhatsApp dispatch warning:", waErr.message);
      onboardingRecord.whatsappStatus = "failed";
      onboardingRecord.lastWhatsappError = waErr.message;
    }

    onboardingRecord.onboardingStatus = ONBOARDING_STATUS.INVITATION_SENT;
    await onboardingRecord.save();

    // Audit log
    await recordAudit({
      actorId: adminUser._id,
      actorRole: adminUser.role,
      action: "STAFF_ONBOARDED",
      targetEntity: "User",
      targetId: newUser._id.toString(),
      details: {
        role,
        employeeCode,
        email: newUser.email,
        phone: newUser.phone,
        emailStatus: onboardingRecord.emailStatus,
        whatsappStatus: onboardingRecord.whatsappStatus,
        isDoctorVerified: role === "doctor" ? doctorProfile.isVerified : undefined,
      },
      ipAddress: adminUser.ip,
    });

    return {
      success: true,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
      },
      employee: {
        _id: newEmployee._id,
        employeeCode: newEmployee.employeeCode,
        department: newEmployee.department,
        designation: newEmployee.designation,
        joiningDate: newEmployee.joiningDate,
      },
      doctor: doctorProfile,
      sales: salesMemberProfile,
      onboarding: onboardingRecord,
      invitation: {
        expiresAt,
        activationUrl, // Provided for admin copy if email bounce
      },
    };
  }

  /**
   * Resend Account Activation Invitation
   */
  async resendInvitation({ adminUser, userId }) {
    if (!adminUser || !["owner", "admin", "super_admin"].includes(adminUser.role)) {
      throw new ForbiddenError("Only authorized Admin or Owner users can resend staff invitations");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("Staff user not found");
    }

    const employee = await Employee.findOne({ userId: user._id });
    if (!employee) {
      throw new NotFoundError("Staff employee record not found");
    }

    let onboardingRecord = await StaffOnboarding.findOne({ userId: user._id });
    if (!onboardingRecord) {
      onboardingRecord = await StaffOnboarding.create({
        userId: user._id,
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        onboardingStatus: ONBOARDING_STATUS.ACCOUNT_CREATED,
        createdBy: adminUser._id,
      });
    }

    // Invalidate prior active invitations
    await StaffInvitation.updateMany(
      { userId: user._id, invitationStatus: "pending" },
      { $set: { invitationStatus: "revoked", updatedAt: new Date() } }
    );

    // Generate fresh secure token
    const { rawToken, tokenHash, expiresAt } = StaffInvitation.generateSecureToken(48);

    await StaffInvitation.create({
      userId: user._id,
      employeeId: employee._id,
      role: user.role,
      tokenHash,
      expiresAt,
      invitationStatus: "pending",
      createdBy: adminUser._id,
    });

    const frontendBaseUrl = (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
    const activationUrl = `${frontendBaseUrl}/activate-account?token=${rawToken}`;
    const loginUrl = `${frontendBaseUrl}/login`;

    // Email dispatch
    try {
      const emailResult = await emailService.sendEmail({
        to: user.email,
        templateId: "staff_onboarding_invitation",
        data: {
          name: user.name,
          role: user.role,
          employeeCode: employee.employeeCode,
          department: employee.department,
          activationUrl,
          portalUrl: loginUrl,
        },
      });
      onboardingRecord.emailStatus = "sent";
      onboardingRecord.emailProviderMessageId = emailResult?.messageId || "sent";
    } catch (emailErr) {
      onboardingRecord.emailStatus = "failed";
      onboardingRecord.lastEmailError = emailErr.message;
    }

    // WhatsApp dispatch
    try {
      const waResult = await whatsappService.sendStaffOnboardingNotification({
        to: user.phone,
        name: user.name,
        role: user.role,
        employeeCode: employee.employeeCode,
        portalUrl: loginUrl,
        idempotencyKey: `staff_resend_${user._id}_${Date.now()}`,
        initiator: { type: "admin", userId: adminUser._id },
      });
      onboardingRecord.whatsappStatus = waResult?.success ? "sent" : "queued";
      onboardingRecord.whatsappProviderMessageId = waResult?.messages?.[0]?.id || waResult?.messageId || "sent";
    } catch (waErr) {
      onboardingRecord.whatsappStatus = "failed";
      onboardingRecord.lastWhatsappError = waErr.message;
    }

    onboardingRecord.onboardingStatus = ONBOARDING_STATUS.INVITATION_SENT;
    onboardingRecord.lastAttemptAt = new Date();
    await onboardingRecord.save();

    await recordAudit({
      actorId: adminUser._id,
      actorRole: adminUser.role,
      action: "STAFF_INVITATION_RESENT",
      targetEntity: "User",
      targetId: user._id.toString(),
      details: { emailStatus: onboardingRecord.emailStatus, whatsappStatus: onboardingRecord.whatsappStatus },
    });

    return {
      success: true,
      onboarding: onboardingRecord,
      invitation: { expiresAt, activationUrl },
    };
  }

  /**
   * Verify Doctor Medical Council Credentials (Enables clinical booking eligibility)
   */
  async verifyDoctorCredentials({ adminUser, doctorId, registrationNumber, registrationCouncil, notes }) {
    if (!adminUser || !["owner", "admin", "super_admin"].includes(adminUser.role)) {
      throw new ForbiddenError("Only authorized Admin or Owner users can verify doctor credentials");
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      throw new NotFoundError("Doctor record not found");
    }

    doctor.isVerified = true;
    doctor.verificationStatus = "verified";
    doctor.verifiedAt = new Date();
    doctor.verifiedBy = adminUser._id;
    if (registrationNumber) doctor.registrationNumber = registrationNumber.trim();
    if (registrationCouncil) doctor.registrationCouncil = registrationCouncil.trim();
    if (notes) doctor.verificationNotes = notes.trim();

    await doctor.save();

    await recordAudit({
      actorId: adminUser._id,
      actorRole: adminUser.role,
      action: "DOCTOR_CREDENTIALS_VERIFIED",
      targetEntity: "Doctor",
      targetId: doctor._id.toString(),
      details: {
        registrationNumber: doctor.registrationNumber,
        registrationCouncil: doctor.registrationCouncil,
      },
    });

    return {
      success: true,
      doctor,
    };
  }

  /**
   * Suspend or Reactivate Staff Account
   */
  async updateStaffStatus({ adminUser, userId, status, reason }) {
    if (!adminUser || !["owner", "admin", "super_admin"].includes(adminUser.role)) {
      throw new ForbiddenError("Only authorized Admin or Owner users can manage staff account status");
    }

    if (!["active", "suspended"].includes(status)) {
      throw new ValidationError("Status must be either 'active' or 'suspended'");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("Staff user not found");
    }

    user.status = status;
    await user.save();

    const employee = await Employee.findOne({ userId: user._id });
    if (employee) {
      employee.status = status === "active" ? "active" : "terminated";
      await employee.save();
    }

    const onboarding = await StaffOnboarding.findOne({ userId: user._id });
    if (onboarding) {
      onboarding.onboardingStatus = status === "active" ? ONBOARDING_STATUS.ACTIVE : ONBOARDING_STATUS.SUSPENDED;
      onboarding.notes = reason ? reason.trim() : "";
      await onboarding.save();
    }

    // If suspended, revoke active tokens immediately
    if (status === "suspended") {
      await StaffInvitation.updateMany(
        { userId: user._id, invitationStatus: "pending" },
        { $set: { invitationStatus: "revoked", updatedAt: new Date() } }
      );
    }

    await recordAudit({
      actorId: adminUser._id,
      actorRole: adminUser.role,
      action: status === "suspended" ? "STAFF_ACCOUNT_SUSPENDED" : "STAFF_ACCOUNT_REACTIVATED",
      targetEntity: "User",
      targetId: user._id.toString(),
      details: { status, reason },
    });

    return {
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    };
  }

  /**
   * Step 6: Consume One-Time Activation Token & Set Password
   */
  async activateAccount({ rawToken, password, confirmPassword }) {
    if (!rawToken || typeof rawToken !== "string") {
      throw new ValidationError("Account activation token is required");
    }

    if (!password || password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long");
    }

    if (confirmPassword && password !== confirmPassword) {
      throw new ValidationError("Password and confirm password do not match");
    }

    const tokenHash = StaffInvitation.hashToken(rawToken);
    const invitation = await StaffInvitation.findOne({ tokenHash });

    if (!invitation) {
      throw new ValidationError("Invalid or unverified activation token");
    }

    if (invitation.invitationStatus === "used" || invitation.usedAt) {
      throw new ValidationError("This activation token has already been used. Please log in or request a new invitation.");
    }

    if (invitation.invitationStatus === "revoked") {
      throw new ValidationError("This activation invitation has been revoked by administration.");
    }

    if (new Date() > invitation.expiresAt) {
      invitation.invitationStatus = "expired";
      await invitation.save();
      throw new ValidationError("This activation link has expired. Please contact administration for a new activation link.");
    }

    const user = await User.findById(invitation.userId);
    if (!user) {
      throw new NotFoundError("Associated staff account not found");
    }

    // Set user password and activate
    const passwordHash = await User.hashPassword(password);
    user.passwordHash = passwordHash;
    user.status = "active";
    user.activatedAt = new Date();
    await user.save();

    // Mark invitation as consumed
    invitation.usedAt = new Date();
    invitation.invitationStatus = "used";
    await invitation.save();

    // Update Onboarding record
    const onboarding = await StaffOnboarding.findOne({ userId: user._id });
    if (onboarding) {
      onboarding.onboardingStatus = ONBOARDING_STATUS.ACTIVE;
      onboarding.activatedAt = new Date();
      await onboarding.save();
    }

    // Send confirmation email
    try {
      const frontendBaseUrl = (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
      await emailService.sendEmail({
        to: user.email,
        templateId: "staff_account_activated",
        data: {
          name: user.name,
          loginUrl: `${frontendBaseUrl}/login`,
        },
      });
    } catch (confErr) {
      console.warn("[Staff Activation] Confirmation email note:", confErr.message);
    }

    await recordAudit({
      actorId: user._id,
      actorRole: user.role,
      action: "STAFF_ACCOUNT_ACTIVATED",
      targetEntity: "User",
      targetId: user._id.toString(),
      details: { role: user.role, email: user.email },
    });

    return {
      success: true,
      message: "Your account has been successfully activated. You can now log in.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * List Staff with Onboarding & Verification Statuses
   */
  async listStaff({ role = null, status = null, limit = 50, page = 1 } = {}) {
    const query = { role: { $in: ["doctor", "sales"] } };
    if (role && ["doctor", "sales"].includes(role)) {
      query.role = role;
    }
    if (status) {
      query.status = status;
    }

    const skip = (Math.max(page, 1) - 1) * limit;
    const users = await User.find(query)
      .select("-passwordHash")
      .populate("employeeId")
      .populate("doctorId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    // Merge onboarding records
    const userIds = users.map((u) => u._id);
    const onboardings = await StaffOnboarding.find({ userId: { $in: userIds } }).lean();
    const onboardingMap = new Map(onboardings.map((o) => [String(o.userId), o]));

    const staffList = users.map((u) => {
      const ob = onboardingMap.get(String(u._id)) || null;
      return {
        ...u,
        onboarding: ob,
        employeeCode: u.employeeId?.employeeCode || ob?.employeeCode || null,
        isDoctorVerified: u.role === "doctor" ? Boolean(u.doctorId?.isVerified) : undefined,
        doctorVerificationStatus: u.role === "doctor" ? u.doctorId?.verificationStatus || "pending" : undefined,
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      staff: staffList,
    };
  }
}

module.exports = new StaffOnboardingService();
