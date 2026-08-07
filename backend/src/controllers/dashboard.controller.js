const inventoryModel = require('../models/inventory.model');
const invoicesModel = require('../models/invoices.model');

function summary(req, res) {
  const now = new Date();
  const totalStockValue = inventoryModel.totalStockValue();
  const monthlyExpense = invoicesModel.monthlyExpense(now.getFullYear(), now.getMonth() + 1);
  const lowStockItems = inventoryModel.lowStock();
  const recentMovements = inventoryModel.recentMovements(8);
  const recentInvoices = invoicesModel.all().slice(0, 5);

  res.json({
    totalStockValue,
    monthlyExpense,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    recentMovements,
    recentInvoices,
  });
}

module.exports = { summary };
