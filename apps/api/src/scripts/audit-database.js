const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runAudit() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trigyna';
  console.log('Connecting to database for audit...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log(`\n=== DISCOVERED ${collections.length} COLLECTIONS IN MONGODB ===`);

  const report = [];

  for (const col of collections) {
    const name = col.name;
    const count = await db.collection(name).countDocuments();
    const indexes = await db.collection(name).indexes();
    report.push({
      collection: name,
      count,
      indexes: indexes.map(i => ({ name: i.name, keys: i.key, unique: !!i.unique }))
    });
    console.log(`\nCollection: [${name}] | Documents: ${count}`);
    indexes.forEach(idx => {
      console.log(`  Index: ${idx.name} -> ${JSON.stringify(idx.key)} (unique: ${!!idx.unique})`);
    });
  }

  // Cross-reference data integrity checks:
  console.log('\n=== DATA INTEGRITY & REFERENCE CHECKS ===');

  // 1. Appointments -> Patient, Doctor
  const orphanAppointments = await db.collection('appointments').aggregate([
    {
      $lookup: {
        from: 'patients',
        localField: 'patientId',
        foreignField: '_id',
        as: 'patient'
      }
    },
    { $match: { patient: { $size: 0 } } },
    { $count: 'count' }
  ]).toArray();
  console.log(`Appointments with missing Patient reference: ${orphanAppointments[0]?.count || 0}`);

  // 2. Invoices -> Patient
  const orphanInvoices = await db.collection('invoices').aggregate([
    {
      $lookup: {
        from: 'patients',
        localField: 'patientId',
        foreignField: '_id',
        as: 'patient'
      }
    },
    { $match: { patient: { $size: 0 } } },
    { $count: 'count' }
  ]).toArray();
  console.log(`Invoices with missing Patient reference: ${orphanInvoices[0]?.count || 0}`);

  // 3. Consultations -> Patient, Doctor
  const orphanConsultations = await db.collection('consultations').aggregate([
    {
      $lookup: {
        from: 'patients',
        localField: 'patientId',
        foreignField: '_id',
        as: 'patient'
      }
    },
    { $match: { patient: { $size: 0 } } },
    { $count: 'count' }
  ]).toArray();
  console.log(`Consultations with missing Patient reference: ${orphanConsultations[0]?.count || 0}`);

  // 4. Prescriptions -> Consultation
  const orphanPrescriptions = await db.collection('prescriptions').aggregate([
    {
      $lookup: {
        from: 'patients',
        localField: 'patientId',
        foreignField: '_id',
        as: 'patient'
      }
    },
    { $match: { patient: { $size: 0 } } },
    { $count: 'count' }
  ]).toArray();
  console.log(`Prescriptions with missing Patient reference: ${orphanPrescriptions[0]?.count || 0}`);

  // 5. Employees -> User
  const orphanEmployees = await db.collection('employees').aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $match: { user: { $size: 0 } } },
    { $count: 'count' }
  ]).toArray();
  console.log(`Employees with missing User account reference: ${orphanEmployees[0]?.count || 0}`);

  // 6. Doctors -> User
  const orphanDoctors = await db.collection('doctors').aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $match: { user: { $size: 0 } } },
    { $count: 'count' }
  ]).toArray();
  console.log(`Doctors with missing User account reference: ${orphanDoctors[0]?.count || 0}`);

  // 7. Receipts -> Invoice, Payment
  const orphanReceipts = await db.collection('receipts').aggregate([
    {
      $lookup: {
        from: 'invoices',
        localField: 'invoiceId',
        foreignField: '_id',
        as: 'invoice'
      }
    },
    { $match: { invoice: { $size: 0 } } },
    { $count: 'count' }
  ]).toArray();
  console.log(`Receipts with missing Invoice reference: ${orphanReceipts[0]?.count || 0}`);

  console.log('\nAudit complete.');
  await mongoose.disconnect();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
