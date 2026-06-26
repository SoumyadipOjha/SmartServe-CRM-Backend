'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Deal     = require('../models/deal.model');
const Customer = require('../models/customer.model');
const User     = require('../models/user.model');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Grab the demo@flayx.app user (the active demo account)
    const user      = await User.findOne({ email: 'demo@flayx.app' }).lean()
                   || await User.findOne().lean();
    const customers = await Customer.find().limit(10).lean();

    if (!user)              { console.error('No users found — log in first'); process.exit(1); }
    if (!customers.length)  { console.error('No customers found — add customers first'); process.exit(1); }

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function future(days) { const d = new Date(); d.setDate(d.getDate() + days); return d; }
    function past(days)   { const d = new Date(); d.setDate(d.getDate() - days); return d; }

    const templates = [
        { title: 'Enterprise SaaS License',   stage: 'negotiation', value: 24000, daysFromNow: 14  },
        { title: 'Annual Support Contract',    stage: 'proposal',    value: 8500,  daysFromNow: 21  },
        { title: 'Platform Onboarding',        stage: 'contacted',   value: 3200,  daysFromNow: 30  },
        { title: 'Q3 Marketing Retainer',      stage: 'won',         value: 6000,  daysFromNow: -5  },
        { title: 'Custom Integration Project', stage: 'lead',        value: 15000, daysFromNow: 45  },
        { title: 'Starter Pack Upgrade',       stage: 'contacted',   value: 1200,  daysFromNow: 10  },
        { title: 'Data Migration Service',     stage: 'proposal',    value: 5500,  daysFromNow: 7   },
        { title: 'Security Audit & Hardening', stage: 'negotiation', value: 9800,  daysFromNow: 18  },
        { title: 'Mobile App Development',     stage: 'lead',        value: 32000, daysFromNow: 60  },
        { title: 'Legacy System Replacement',  stage: 'lost',        value: 18000, daysFromNow: -10 },
        { title: 'Monthly Analytics Reports',  stage: 'won',         value: 2400,  daysFromNow: -2  },
        { title: 'Cloud Infrastructure Setup', stage: 'proposal',    value: 11000, daysFromNow: 25  },
    ];

    // Remove existing demo deals to keep idempotent
    await Deal.deleteMany({ createdBy: user._id });
    console.log('Cleared existing deals for this user');

    const deals = templates.map((t, i) => ({
        title:             t.title,
        customer:          customers[i % customers.length]._id,
        createdBy:         user._id,
        stage:             t.stage,
        value:             t.value,
        expectedCloseDate: t.daysFromNow > 0 ? future(t.daysFromNow) : past(-t.daysFromNow),
        order:             i,
        notes:             `Demo deal — ${t.stage} stage`,
    }));

    await Deal.insertMany(deals);
    console.log(`Inserted ${deals.length} demo deals`);

    // Print summary by stage
    const stages = ['lead','contacted','proposal','negotiation','won','lost'];
    for (const s of stages) {
        const count = deals.filter(d => d.stage === s).length;
        const total = deals.filter(d => d.stage === s).reduce((sum, d) => sum + d.value, 0);
        if (count) console.log(`  ${s.padEnd(12)} ${count} deal(s)   $${total.toLocaleString()}`);
    }

    await mongoose.disconnect();
    console.log('Done');
}

main().catch(err => { console.error(err); process.exit(1); });
