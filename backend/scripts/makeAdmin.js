require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
(async () => {
  const email = process.argv[2];
  if (!email) return console.log('Usage: npm run make-admin -- you@email.com');
  await mongoose.connect(process.env.MONGO_URI);
  const u = await User.findOneAndUpdate({ email: email.toLowerCase() }, { role: 'admin' }, { new: true });
  console.log(u ? `${u.username} is now an admin` : 'User not found');
  process.exit(0);
})();
