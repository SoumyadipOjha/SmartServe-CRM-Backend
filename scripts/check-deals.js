'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Deal = require('../models/deal.model');
const User = require('../models/user.model');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const users = await User.find().lean();
    console.log('Users in DB:');
    users.forEach(u => console.log(`  ${u._id}  ${u.email}  ${u.name}`));
    const deals = await Deal.find().lean();
    console.log(`\nTotal deals in DB: ${deals.length}`);
    deals.forEach(d => console.log(`  stage=${d.stage}  createdBy=${d.createdBy}  title=${d.title}`));
    await mongoose.disconnect();
}
main().catch(console.error);
