const Doctor = require("./doctor.model");
const User = require("../users/user.model");
const Employee = require("../hrms/employee.model");
const Appointment = require("../appointments/appointment.model");
const Consultation = require("../clinical/consultation.model");
const { sendSuccess } = require("../../shared/response");
const { ValidationError, NotFoundError, ConflictError } = require("../../shared/errors");
const { recordAudit } = require("../audit/audit.service");


async function listDoctors(req, res, next) {
  try {
    const { status = "all" } = req.query;
    const query = {};
    if (status !== "all") query.status = status;

    const doctors = await Doctor.find(query)
      .populate("userId", "name email phone status role")
      .sort({ createdAt: -1 });

    return sendSuccess(res, { doctors, count: doctors.length }, "Doctors retrieved");
  } catch (err) {
    return next(err);
  }
}

async function getDoctorById(req, res, next) {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("userId", "name email phone status");
    if (!doctor) {
      return next(new NotFoundError("Doctor profile not found"));
    }
    return sendSuccess(res, { doctor }, "Doctor profile retrieved");
  } catch (err) {
    return next(err);
  }
}

async function createDoctorProfile(req, res, next) {
  try {
    const {
      userId,
      name,
      email,
      phone,
      password,
      specialization,
      qualifications,
      consultationFee,
      bio,
      workingHours,
      salary,
      department,
      employeeCode,
    } = req.body;

    let targetUserId = userId;
    if (!targetUserId) {
      if (!name || !phone) {
        return next(new ValidationError("Doctor Name and Phone are required when User ID is not provided"));
      }
      let user = await User.findOne({
        $or: [
          { phone: phone.trim() },
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ],
      });
      if (!user) {
        const passwordHash = await User.hashPassword(password || "TriGyna@123");
        user = await User.create({
          name: name.trim(),
          phone: phone.trim(),
          email: email ? email.trim().toLowerCase() : undefined,
          passwordHash,
          role: "doctor",
          status: "active",
        });
      } else {
        if (user.role !== "doctor" && user.role !== "owner") {
          user.role = "doctor";
          await user.save();
        }
      }
      targetUserId = user._id;
    } else {
      const user = await User.findById(targetUserId);
      if (!user) {
        return next(new NotFoundError("User not found"));
      }
      if (user.role !== "doctor" && user.role !== "owner") {
        user.role = "doctor";
        await user.save();
      }
    }

    const existingDoctor = await Doctor.findOne({ userId: targetUserId });
    if (existingDoctor) {
      return next(new ConflictError("Doctor profile already exists for this user"));
    }

    // Auto-create/link HRMS Employee record if missing
    let emp = await Employee.findOne({ userId: targetUserId });
    if (!emp) {
      let empCode = employeeCode || `DOC-${Date.now().toString().slice(-4)}`;
      while (await Employee.exists({ employeeCode: empCode })) {
        empCode = `DOC-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      let validDept = "Clinical";
      if (department) {
        if (/admin/i.test(department)) validDept = "Administration";
        else if (/reception/i.test(department)) validDept = "Reception";
        else if (/crm/i.test(department)) validDept = "CRM";
        else if (/hr/i.test(department)) validDept = "HR";
        else if (/finance/i.test(department)) validDept = "Finance";
        else validDept = "Clinical";
      }

      emp = await Employee.create({
        userId: targetUserId,
        employeeCode: empCode,
        department: validDept,
        designation: qualifications ? `Consultant Doctor (${qualifications})` : "Consultant Homoeopath",
        joiningDate: new Date(),
        salary: salary || 65000,
        employmentType: "consultant",
        shift: "morning",
        status: "active",
      });
    }

    const doctor = await Doctor.create({
      userId: targetUserId,
      specialization: Array.isArray(specialization) ? specialization : [specialization || "Homoeopathy"],
      qualifications: qualifications || "BHMS, Consultant Homoeopath",
      consultationFee: consultationFee || 500,
      bio: bio || "",
      workingHours: workingHours || [
        { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 2, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 6, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
      ],
    });

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "DOCTOR_PROFILE_CREATED",
      targetEntity: "Doctor",
      targetId: doctor._id.toString(),
      ipAddress: req.ip,
      details: { doctorId: doctor._id, employeeId: emp ? emp._id : undefined },
    });

    return sendSuccess(res, { doctor, employee: emp }, "Doctor profile created successfully", 201);
  } catch (err) {
    return next(err);
  }
}

async function updateDoctorProfile(req, res, next) {
  try {
    const { specialization, qualifications, consultationFee, bio, status, workingHours } = req.body;
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return next(new NotFoundError("Doctor profile not found"));
    }

    // Restrict editing other doctors unless Admin/Owner
    if (req.user.role === "doctor" && doctor.userId.toString() !== req.user._id.toString()) {
      return next(new ValidationError("Doctors can only modify their own availability profile"));
    }

    if (specialization) doctor.specialization = specialization;
    if (qualifications) doctor.qualifications = qualifications;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (bio !== undefined) doctor.bio = bio;
    if (status && ["owner", "admin"].includes(req.user.role)) doctor.status = status;
    if (workingHours) doctor.workingHours = workingHours;

    await doctor.save();

    return sendSuccess(res, { doctor }, "Doctor profile updated");
  } catch (err) {
    return next(err);
  }
}

// Permanent Database Deletion (Requires Owner/Admin with Dependency Validation)
async function deleteDoctorPermanently(req, res, next) {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findById(id).populate("userId", "name phone email");
    if (!doctor) {
      return next(new NotFoundError("Doctor profile not found"));
    }

    const doctorName = doctor.userId?.name || "Doctor";

    // 1. Dependency Check: Existing Appointments
    const apptCount = await Appointment.countDocuments({ doctorId: doctor._id });
    if (apptCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete doctor '${doctorName}': ${apptCount} clinical appointment(s) exist. Historical patient care records and encounter bookings depend on this doctor. Reassign appointments or set status to inactive instead.`
        )
      );
    }

    // 2. Dependency Check: Clinical Consultations
    const consultCount = await Consultation.countDocuments({ doctorId: doctor._id });
    if (consultCount > 0) {
      return next(
        new ConflictError(
          `Cannot permanently delete doctor '${doctorName}': ${consultCount} consultation encounter(s) exist. Medical retention compliance mandates keeping clinician profiles linked to past medical notes.`
        )
      );
    }

    // 3. Perform Permanent Deletion
    await Doctor.findByIdAndDelete(id);

    // Deactivate linked HRMS employee profile
    if (doctor.userId?._id) {
      await Employee.updateOne(
        { userId: doctor.userId._id },
        { $set: { status: "inactive" } }
      );
    }

    await recordAudit({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "DOCTOR_PERMANENTLY_DELETED",
      targetEntity: "Doctor",
      targetId: id,
      details: {
        doctorName,
        specialization: doctor.specialization,
        qualifications: doctor.qualifications,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(
      res,
      { deletedId: id, doctorName },
      `Doctor profile for '${doctorName}' permanently deleted from database`
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listDoctors,
  getDoctorById,
  createDoctorProfile,
  updateDoctorProfile,
  deleteDoctorPermanently,
};

