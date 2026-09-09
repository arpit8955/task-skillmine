import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Customer, Order, KnowledgeArticle } from '../models/index.js';

const customers = [
  {
    customerId: 'CUS-1001',
    name: 'Rahul Sharma',
    email: 'rahul.sharma@email.com',
    accountStatus: 'active',
    orderIds: ['ORD-1001', 'ORD-1003'],
    previousSupportHistory: [
      {
        ticketId: 'TK-501',
        date: new Date('2024-11-15'),
        issue: 'Late delivery inquiry',
        resolution: 'Provided updated tracking information',
        satisfaction: 'satisfied',
      },
    ],
  },
  {
    customerId: 'CUS-1002',
    name: 'Priya Patel',
    email: 'priya.patel@email.com',
    accountStatus: 'active',
    orderIds: ['ORD-1002'],
    previousSupportHistory: [
      {
        ticketId: 'TK-502',
        date: new Date('2024-10-20'),
        issue: 'Wrong item received',
        resolution: 'Full refund issued',
        satisfaction: 'satisfied',
      },
      {
        ticketId: 'TK-510',
        date: new Date('2024-12-05'),
        issue: 'Requested refund for delayed order',
        resolution: 'Partial credit issued',
        satisfaction: 'neutral',
      },
    ],
  },
  {
    customerId: 'CUS-1003',
    name: 'Amit Kumar',
    email: 'amit.kumar@email.com',
    accountStatus: 'active',
    orderIds: ['ORD-1004', 'ORD-1005'],
    previousSupportHistory: [],
  },
  {
    customerId: 'CUS-1004',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@email.com',
    accountStatus: 'suspended',
    orderIds: ['ORD-1006'],
    previousSupportHistory: [
      {
        ticketId: 'TK-520',
        date: new Date('2024-09-10'),
        issue: 'Fraudulent refund attempt',
        resolution: 'Account flagged and suspended',
        satisfaction: 'unsatisfied',
      },
      {
        ticketId: 'TK-525',
        date: new Date('2024-09-15'),
        issue: 'Multiple refund requests for same item',
        resolution: 'Denied - suspicious activity',
        satisfaction: 'unsatisfied',
      },
    ],
  },
];

const orders = [
  {
    orderId: 'ORD-1001',
    customerId: 'CUS-1001',
    status: 'shipped',
    amount: 2499,
    currency: 'INR',
    items: [{ name: 'Wireless Headphones', quantity: 1, price: 2499 }],
    shippingStatus: 'in_transit',
    expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    trackingNumber: 'TRK-9876543210',
    paymentStatus: 'paid',
  },
  {
    orderId: 'ORD-1002',
    customerId: 'CUS-1002',
    status: 'delivered',
    amount: 50000,
    currency: 'INR',
    items: [{ name: 'Laptop Stand Pro', quantity: 1, price: 15000 }, { name: 'Mechanical Keyboard', quantity: 1, price: 35000 }],
    shippingStatus: 'delivered',
    expectedDeliveryDate: new Date('2024-12-01'),
    trackingNumber: 'TRK-1234567890',
    paymentStatus: 'paid',
  },
  {
    orderId: 'ORD-1003',
    customerId: 'CUS-1001',
    status: 'delivered',
    amount: 899,
    currency: 'INR',
    items: [{ name: 'Phone Case', quantity: 1, price: 899 }],
    shippingStatus: 'delivered',
    expectedDeliveryDate: new Date('2024-11-20'),
    trackingNumber: 'TRK-5555555555',
    paymentStatus: 'paid',
  },
  {
    orderId: 'ORD-1004',
    customerId: 'CUS-1003',
    status: 'processing',
    amount: 4999,
    currency: 'INR',
    items: [{ name: 'Smart Watch', quantity: 1, price: 4999 }],
    shippingStatus: 'pending',
    expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    trackingNumber: null,
    paymentStatus: 'paid',
  },
  {
    orderId: 'ORD-1005',
    customerId: 'CUS-1003',
    status: 'shipped',
    amount: 12500,
    currency: 'INR',
    items: [{ name: 'Bluetooth Speaker', quantity: 1, price: 7500 }, { name: 'Earbuds', quantity: 1, price: 5000 }],
    shippingStatus: 'out_for_delivery',
    expectedDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    trackingNumber: 'TRK-7777777777',
    paymentStatus: 'paid',
  },
  {
    orderId: 'ORD-1006',
    customerId: 'CUS-1004',
    status: 'delivered',
    amount: 3200,
    currency: 'INR',
    items: [{ name: 'USB Hub', quantity: 2, price: 1600 }],
    shippingStatus: 'delivered',
    expectedDeliveryDate: new Date('2024-09-05'),
    trackingNumber: 'TRK-8888888888',
    paymentStatus: 'paid',
  },
];

const knowledgeArticles = [
  {
    articleId: 'KB-001',
    title: 'Refund Policy',
    category: 'refunds',
    content: 'Refunds are available within 30 days of delivery for undamaged items. Refunds over ₹10,000 require manager approval. Processing takes 5-7 business days. Customers with a history of excessive refund requests may be subject to additional review. Partial refunds may be offered for items with minor defects.',
    tags: ['refund', 'return', 'policy', 'money back'],
  },
  {
    articleId: 'KB-002',
    title: 'Shipping and Delivery Information',
    category: 'shipping',
    content: 'Standard delivery takes 3-7 business days. Express delivery takes 1-2 business days. Tracking numbers are provided once the order is shipped. Delays during peak seasons are possible. Contact support if delivery is more than 3 days past the expected date.',
    tags: ['shipping', 'delivery', 'tracking', 'transit'],
  },
  {
    articleId: 'KB-003',
    title: 'Damaged Product Compensation',
    category: 'compensation',
    content: 'If a product arrives damaged, customers may be eligible for a full replacement or partial compensation. Photo evidence of damage is required. Compensation decisions for amounts over ₹5,000 require supervisor approval. Replacement products are shipped at no additional cost.',
    tags: ['damaged', 'compensation', 'replacement', 'defect'],
  },
  {
    articleId: 'KB-004',
    title: 'Order Cancellation Policy',
    category: 'cancellation',
    content: 'Orders can be cancelled before they are shipped. Once shipped, cancellation is not possible but customers can initiate a return after delivery. Cancellation requests are processed within 24 hours. Refunds for cancelled orders are processed within 3-5 business days.',
    tags: ['cancel', 'cancellation', 'order'],
  },
  {
    articleId: 'KB-005',
    title: 'Account Security and Fraud Prevention',
    category: 'security',
    content: 'Accounts with suspicious activity may be temporarily suspended for review. Multiple refund requests for the same order will be flagged. Customers can appeal account suspensions by contacting support with valid identification. Fraudulent activity may result in permanent account closure.',
    tags: ['security', 'fraud', 'suspension', 'account'],
  },
];

async function seed() {
  await connectDatabase();

  await Customer.deleteMany({});
  await Order.deleteMany({});
  await KnowledgeArticle.deleteMany({});

  await Customer.insertMany(customers);
  await Order.insertMany(orders);
  await KnowledgeArticle.insertMany(knowledgeArticles);

  console.log('Seed data inserted successfully:');
  console.log(`  - ${customers.length} customers`);
  console.log(`  - ${orders.length} orders`);
  console.log(`  - ${knowledgeArticles.length} knowledge articles`);

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
