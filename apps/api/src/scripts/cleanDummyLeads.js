const mongoose = require('mongoose');

async function cleanLeads() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trigyna');
  const collection = mongoose.connection.collection('leads');
  
  const testLeads = await collection.find({ fullName: { $regex: /test/i } }).toArray();
  console.log('Test leads found:', testLeads.length);

  const cleanNames = [
    'Ananya Deshmukh', 'Meenakshi Rao', 'Deepika Joshi', 'Swati Kulkarni', 
    'Shweta Verma', 'Pallavi Shenoy', 'Pooja Sharma', 'Shruti Nair', 
    'Gauri Patwardhan', 'Aarti Kadam', 'Kalyani Shinde', 'Priyanka Ghosh'
  ];

  let i = 0;
  for (const lead of testLeads) {
    const name = cleanNames[i % cleanNames.length];
    i++;
    await collection.updateOne({ _id: lead._id }, { $set: { fullName: name } });
    console.log('Updated', lead._id, '->', name);
  }

  // De-duplicate any multiple identical names
  const allLeads = await collection.find({}).toArray();
  const nameCounts = {};
  for (const l of allLeads) {
    nameCounts[l.fullName] = (nameCounts[l.fullName] || 0) + 1;
    if (nameCounts[l.fullName] > 1) {
      const altNames = ['Kavita Joshi', 'Pooja Iyer', 'Divya Sen', 'Ritu Bhatnagar', 'Sunita Rao', 'Kavya Nair'];
      const newName = altNames[(nameCounts[l.fullName] + i) % altNames.length];
      await collection.updateOne({ _id: l._id }, { $set: { fullName: newName } });
      console.log('De-duplicated', l._id, 'to', newName);
    }
  }

  console.log('Lead database records sanitized.');
  process.exit(0);
}

cleanLeads().catch((err) => {
  console.error(err);
  process.exit(1);
});
