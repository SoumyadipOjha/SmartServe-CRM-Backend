const Customer = require('../models/customer.model');
const Order = require('../models/order.model');
const Campaign = require('../models/campaign.model');

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

const DEMO_CUSTOMERS = [
    { name: 'Emma Wilson',     email: 'demo.emma@smartserve.app',     phone: '555-0101', totalSpend: 5650, visits: 24, lastActivity: daysAgo(1) },
    { name: 'Isabella Davis',  email: 'demo.isabella@smartserve.app', phone: '555-0102', totalSpend: 4100, visits: 20, lastActivity: daysAgo(2) },
    { name: 'Carol Martinez',  email: 'demo.carol@smartserve.app',    phone: '555-0103', totalSpend: 3200, visits: 18, lastActivity: daysAgo(3) },
    { name: 'Alice Johnson',   email: 'demo.alice@smartserve.app',    phone: '555-0104', totalSpend: 2450, visits: 12, lastActivity: daysAgo(5) },
    { name: 'Grace Lee',       email: 'demo.grace@smartserve.app',    phone: '555-0105', totalSpend: 1800, visits: 9,  lastActivity: daysAgo(8) },
    { name: 'James Taylor',    email: 'demo.james@smartserve.app',    phone: '555-0106', totalSpend: 680,  visits: 4,  lastActivity: daysAgo(30) },
    { name: 'Bob Chen',        email: 'demo.bob@smartserve.app',      phone: '555-0107', totalSpend: 890,  visits: 5,  lastActivity: daysAgo(46) },
    { name: 'Frank Patel',     email: 'demo.frank@smartserve.app',    phone: '555-0108', totalSpend: 450,  visits: 3,  lastActivity: daysAgo(62) },
    { name: 'Henry Brown',     email: 'demo.henry@smartserve.app',    phone: '555-0109', totalSpend: 290,  visits: 2,  lastActivity: daysAgo(78) },
    { name: 'David Kim',       email: 'demo.david@smartserve.app',    phone: '555-0110', totalSpend: 120,  visits: 1,  lastActivity: daysAgo(92) },
];

function buildOrders(customers) {
    const byEmail = {};
    customers.forEach(c => { byEmail[c.email] = c._id; });

    return [
        // Emma — 4 completed orders
        { customer: byEmail['demo.emma@smartserve.app'],     amount: 1200, status: 'completed', orderDate: daysAgo(60),
          products: [{ name: 'Pro Subscription', quantity: 1, price: 1200 }] },
        { customer: byEmail['demo.emma@smartserve.app'],     amount: 850,  status: 'completed', orderDate: daysAgo(30),
          products: [{ name: 'Analytics Add-on', quantity: 1, price: 850 }] },
        { customer: byEmail['demo.emma@smartserve.app'],     amount: 2100, status: 'completed', orderDate: daysAgo(10),
          products: [{ name: 'Enterprise Licence', quantity: 1, price: 2100 }] },
        { customer: byEmail['demo.emma@smartserve.app'],     amount: 1500, status: 'pending',   orderDate: daysAgo(1),
          products: [{ name: 'Team Seats', quantity: 5, price: 300 }] },
        // Isabella — 3 orders
        { customer: byEmail['demo.isabella@smartserve.app'], amount: 1800, status: 'completed', orderDate: daysAgo(90),
          products: [{ name: 'Pro Subscription', quantity: 1, price: 1800 }] },
        { customer: byEmail['demo.isabella@smartserve.app'], amount: 950,  status: 'completed', orderDate: daysAgo(45),
          products: [{ name: 'Custom Integration', quantity: 1, price: 950 }] },
        { customer: byEmail['demo.isabella@smartserve.app'], amount: 1350, status: 'completed', orderDate: daysAgo(5),
          products: [{ name: 'Support Package', quantity: 3, price: 450 }] },
        // Carol — 2 orders
        { customer: byEmail['demo.carol@smartserve.app'],    amount: 1600, status: 'completed', orderDate: daysAgo(120),
          products: [{ name: 'Pro Subscription', quantity: 2, price: 800 }] },
        { customer: byEmail['demo.carol@smartserve.app'],    amount: 1600, status: 'completed', orderDate: daysAgo(20),
          products: [{ name: 'Pro Subscription', quantity: 2, price: 800 }] },
        // Alice — 2 orders
        { customer: byEmail['demo.alice@smartserve.app'],    amount: 1200, status: 'completed', orderDate: daysAgo(80),
          products: [{ name: 'Starter Plan', quantity: 1, price: 1200 }] },
        { customer: byEmail['demo.alice@smartserve.app'],    amount: 1250, status: 'completed', orderDate: daysAgo(15),
          products: [{ name: 'Starter Plan', quantity: 1, price: 950 }, { name: 'Reports Add-on', quantity: 1, price: 300 }] },
        // Grace — 1 order
        { customer: byEmail['demo.grace@smartserve.app'],    amount: 1800, status: 'completed', orderDate: daysAgo(25),
          products: [{ name: 'Business Plan', quantity: 1, price: 1800 }] },
        // James — 1 order (dormant)
        { customer: byEmail['demo.james@smartserve.app'],    amount: 680,  status: 'completed', orderDate: daysAgo(35),
          products: [{ name: 'Starter Plan', quantity: 1, price: 680 }] },
        // Bob — 1 order (dormant)
        { customer: byEmail['demo.bob@smartserve.app'],      amount: 890,  status: 'completed', orderDate: daysAgo(50),
          products: [{ name: 'Starter Plan', quantity: 1, price: 890 }] },
        // Frank — 1 order (dormant)
        { customer: byEmail['demo.frank@smartserve.app'],    amount: 450,  status: 'cancelled', orderDate: daysAgo(65),
          products: [{ name: 'Trial Package', quantity: 1, price: 450 }] },
    ];
}

function buildCampaigns(userId, customers) {
    const dormant = customers
        .filter(c => ['demo.bob@smartserve.app','demo.frank@smartserve.app','demo.henry@smartserve.app','demo.david@smartserve.app'].includes(c.email))
        .map(c => c._id);

    const vip = customers
        .filter(c => ['demo.emma@smartserve.app','demo.isabella@smartserve.app','demo.carol@smartserve.app'].includes(c.email))
        .map(c => c._id);

    return [
        {
            name: 'Win-Back Dormant Users',
            description: 'Re-engage customers who haven\'t purchased in over 45 days.',
            rules: { conditions: [{ field: 'lastActivity', operator: '<', value: 45 }], condition: 'AND' },
            message: 'Hi {{name}}, we miss you! Come back and enjoy 20% off your next order. Use code WELCOME20.',
            audience: dormant,
            audienceSize: dormant.length,
            deliveryStats: { sent: dormant.length, failed: 0 },
            status: 'completed',
            createdBy: userId,
        },
        {
            name: 'VIP Summer Exclusive',
            description: 'Special offer for our highest-value customers.',
            rules: { conditions: [{ field: 'totalSpend', operator: '>', value: 3000 }], condition: 'AND' },
            message: 'Hey {{name}} — as one of our top customers, you get early access to our summer sale. 15% off everything, this week only.',
            audience: vip,
            audienceSize: vip.length,
            deliveryStats: { sent: vip.length, failed: 0 },
            status: 'completed',
            createdBy: userId,
        },
        {
            name: 'Re-engage Inactive Customers',
            description: 'Target customers with only 1–2 visits and low spend.',
            rules: { conditions: [{ field: 'visits', operator: '<=', value: 2 }, { field: 'totalSpend', operator: '<', value: 500 }], condition: 'AND' },
            message: 'Hi {{name}}, we\'d love to help you get more value from Flayx. Book a free onboarding call today.',
            audience: [],
            audienceSize: 0,
            deliveryStats: { sent: 0, failed: 0 },
            status: 'draft',
            createdBy: userId,
        },
    ];
}

async function seedDemoData(userId) {
    // Upsert customers (safe to call on every demo login)
    const customerDocs = await Promise.all(
        DEMO_CUSTOMERS.map(c =>
            Customer.findOneAndUpdate(
                { email: c.email },
                { $set: c },
                { upsert: true, new: true }
            )
        )
    );

    // Seed orders only once (skip if already exist for these customers)
    const existingOrderCount = await Order.countDocuments({
        customer: { $in: customerDocs.map(c => c._id) }
    });
    if (existingOrderCount === 0) {
        await Order.insertMany(buildOrders(customerDocs));
    }

    // Seed campaigns scoped to this demo user (once per user)
    const existingCampaignCount = await Campaign.countDocuments({ createdBy: userId });
    if (existingCampaignCount === 0) {
        await Campaign.insertMany(buildCampaigns(userId, customerDocs));
    }
}

module.exports = { seedDemoData };
