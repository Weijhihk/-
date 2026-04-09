import React, { useState, useEffect } from 'react';
import { Calculator, Save, FileSpreadsheet } from 'lucide-react';

interface CostItem {
  id: string;
  itemNumber: string;
  name: string;
  unit: string;
  budgetQuantity: number;
  budgetUnitPrice: number;
  actualQuantity: number;
  actualUnitPrice: number;
  isPriceAnalysisItem?: boolean;
}

const CATEGORIES: Record<string, string> = {
  'A': '土建工程',
  'B': '裝修工程',
  'C': '機電工程',
  'D': '設備工程',
  'E': '景觀工程',
  'F': '假設工程',
  '其他': '其他工程'
};

export default function CostSummary() {
  const [items, setItems] = useState<CostItem[]>([]);
  const [totalPing, setTotalPing] = useState<number>(() => {
    return Number(localStorage.getItem('project-total-ping')) || 15229;
  });
  const [hrFeePercent, setHrFeePercent] = useState<number>(() => {
    return Number(localStorage.getItem('project-hr-fee-percent')) || 3;
  });
  const [managementFeePercent, setManagementFeePercent] = useState<number>(() => {
    return Number(localStorage.getItem('project-management-fee-percent')) || 5;
  });
  const [displayLevel, setDisplayLevel] = useState<number>(() => {
    return Number(localStorage.getItem('project-display-level')) || 2;
  });
  const [showActualCost, setShowActualCost] = useState<boolean>(() => {
    return localStorage.getItem('project-show-actual-cost') === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cost-items')
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch cost items:', err);
        setIsLoading(false);
      });
  }, []);

  const handlePingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setTotalPing(val);
    localStorage.setItem('project-total-ping', val.toString());
  };

  const handleHrFeePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setHrFeePercent(val);
    localStorage.setItem('project-hr-fee-percent', val.toString());
  };

  const handleManagementFeePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setManagementFeePercent(val);
    localStorage.setItem('project-management-fee-percent', val.toString());
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = Number(e.target.value);
    setDisplayLevel(val);
    localStorage.setItem('project-display-level', val.toString());
  };

  const handleShowActualCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setShowActualCost(val);
    localStorage.setItem('project-show-actual-cost', val.toString());
  };

  // Aggregation Logic
  const getPrefix = (itemNumber: string, level: number) => {
    const cleanNum = itemNumber.trim();
    if (level === 1) return cleanNum.substring(0, 1);
    if (level === 2) return cleanNum.length >= 3 ? cleanNum.substring(0, 3) : cleanNum;
    if (level === 3) return cleanNum.length >= 5 ? cleanNum.substring(0, 5) : cleanNum;
    if (level === 4) return cleanNum.length >= 8 ? cleanNum.substring(0, 8) : cleanNum;
    return cleanNum;
  };

  const aggregatedItemsMap = new Map<string, any>();
  
  items.forEach(item => {
    const prefix = getPrefix(item.itemNumber, displayLevel);
    const amount = item.isPriceAnalysisItem ? 0 : item.budgetQuantity * item.budgetUnitPrice;
    const actualAmount = item.isPriceAnalysisItem ? 0 : item.actualQuantity * item.actualUnitPrice;
    
    if (!aggregatedItemsMap.has(prefix)) {
      const exactMatch = items.find(i => i.itemNumber === prefix);
      aggregatedItemsMap.set(prefix, {
        id: prefix,
        itemNumber: prefix,
        name: exactMatch ? exactMatch.name : `${prefix} 彙總`,
        unit: exactMatch ? exactMatch.unit : '式',
        amount: amount,
        actualAmount: actualAmount,
        isPriceAnalysisItem: exactMatch ? exactMatch.isPriceAnalysisItem : false,
      });
    } else {
      const existing = aggregatedItemsMap.get(prefix);
      existing.amount += amount;
      existing.actualAmount += actualAmount;
    }
  });

  const aggregatedItems = Array.from(aggregatedItemsMap.values());
  aggregatedItems.sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));

  // Group items
  const groups: Record<string, any[]> = {};
  aggregatedItems.forEach(item => {
    const firstChar = item.itemNumber.charAt(0).toUpperCase();
    const category = CATEGORIES[firstChar] ? firstChar : '其他';
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  });

  // Sort groups A -> F -> 其他
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    if (a === '其他') return 1;
    if (b === '其他') return -1;
    return a.localeCompare(b);
  });

  const grandTotal = items.reduce((sum, item) => sum + (item.isPriceAnalysisItem ? 0 : item.budgetQuantity * item.budgetUnitPrice), 0);
  const grandTotalActual = items.reduce((sum, item) => sum + (item.isPriceAnalysisItem ? 0 : item.actualQuantity * item.actualUnitPrice), 0);
  
  const hrFee = grandTotal * (hrFeePercent / 100); // 工地人事管銷
  const hrFeeActual = grandTotalActual * (hrFeePercent / 100);
  
  const managementFee = grandTotal * (managementFeePercent / 100); // 管理費及利潤
  const managementFeeActual = grandTotalActual * (managementFeePercent / 100);
  
  const totalNoTax = grandTotal + hrFee + managementFee;
  const totalNoTaxActual = grandTotalActual + hrFeeActual + managementFeeActual;
  
  const totalWithTax = totalNoTax * 1.05;
  const totalWithTaxActual = totalNoTaxActual * 1.05;

  return (
    <div className="h-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">成本總表</h1>
              <p className="text-sm text-slate-500 mt-1">工程專案預算總表</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    checked={showActualCost}
                    onChange={handleShowActualCostChange}
                  />
                  顯示實際成本
                </label>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <label htmlFor="displayLevel" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  顯示階層：
                </label>
                <select
                  id="displayLevel"
                  className="block w-32 pl-3 pr-8 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={displayLevel}
                  onChange={handleLevelChange}
                >
                  <option value={1}>第一階 (1碼)</option>
                  <option value={2}>第二階 (3碼)</option>
                  <option value={3}>第三階 (5碼)</option>
                  <option value={4}>第四階 (8碼)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <label htmlFor="totalPing" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  總坪數設定：
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="totalPing"
                    min="1"
                    className="block w-32 pl-3 pr-8 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={totalPing}
                    onChange={handlePingChange}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 sm:text-sm">坪</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden p-4 sm:p-6">
            
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">工程專案預算表</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-slate-800 text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th colSpan={3} className="border border-slate-800 p-2 text-center font-bold">項 目</th>
                    <th className="border border-slate-800 p-2 text-center font-bold w-16">單位</th>
                    <th className="border border-slate-800 p-2 text-center font-bold w-32">
                      {showActualCost ? '預算金額' : '金額'}
                    </th>
                    {showActualCost && (
                      <th className="border border-slate-800 p-2 text-center font-bold w-32 bg-emerald-50">實際金額</th>
                    )}
                    <th className="border border-slate-800 p-2 text-center font-bold w-24">樓地板<br/>面積</th>
                    <th className="border border-slate-800 p-2 text-center font-bold text-red-600 w-24">
                      {showActualCost ? '預算元/坪' : '元/坪'}
                    </th>
                    {showActualCost && (
                      <th className="border border-slate-800 p-2 text-center font-bold text-emerald-600 w-24 bg-emerald-50">實際元/坪</th>
                    )}
                    <th className="border border-slate-800 p-2 text-center font-bold text-blue-600 w-20">百分比</th>
                    <th className="border border-slate-800 p-2 text-center font-bold w-32">備註</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {sortedGroupKeys.map(catKey => {
                    const catItems = groups[catKey];
                    const catTotal = catItems.reduce((sum, item) => sum + item.amount, 0);
                    const catTotalActual = catItems.reduce((sum, item) => sum + item.actualAmount, 0);
                    
                    const visibleCatItems = catItems.filter(item => {
                      const len = item.itemNumber.trim().length;
                      if (displayLevel === 2 && len === 1) return false;
                      if (displayLevel === 3 && (len === 1 || len === 3)) return false;
                      if (displayLevel === 4 && (len === 1 || len === 3 || len === 5)) return false;
                      return true;
                    });
                    
                    return (
                      <React.Fragment key={catKey}>
                        {visibleCatItems.map((item, index) => {
                          const amount = item.amount;
                          const actualAmount = item.actualAmount;
                          const costPerPing = totalPing > 0 ? amount / totalPing : 0;
                          const actualCostPerPing = totalPing > 0 ? actualAmount / totalPing : 0;
                          const percentage = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
                          
                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              {index === 0 && (
                                <td rowSpan={visibleCatItems.length} className="border border-slate-800 p-2 text-center font-medium w-16 bg-white">
                                  {catKey === '其他' ? '其他' : `${catKey}.${CATEGORIES[catKey].substring(0, 2)}`}
                                </td>
                              )}
                              <td className="border border-slate-800 p-2 text-center w-16">
                                {item.isPriceAnalysisItem && <span className="text-red-500 mr-1" title="單價分析子項目">*</span>}
                                {item.itemNumber}
                              </td>
                              <td className="border border-slate-800 p-2">{item.name}</td>
                              <td className="border border-slate-800 p-2 text-center">{item.unit}</td>
                              <td className="border border-slate-800 p-2 text-right font-mono">
                                {item.isPriceAnalysisItem ? '-' : amount.toLocaleString()}
                              </td>
                              {showActualCost && (
                                <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-50/50">
                                  {item.isPriceAnalysisItem ? '-' : actualAmount.toLocaleString()}
                                </td>
                              )}
                              <td className="border border-slate-800 p-2 text-right font-mono">{totalPing.toLocaleString()}</td>
                              <td className="border border-slate-800 p-2 text-right font-mono">
                                {item.isPriceAnalysisItem ? '-' : Math.round(costPerPing).toLocaleString()}
                              </td>
                              {showActualCost && (
                                <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-50/50">
                                  {item.isPriceAnalysisItem ? '-' : Math.round(actualCostPerPing).toLocaleString()}
                                </td>
                              )}
                              <td className="border border-slate-800 p-2 text-right font-mono text-blue-600">
                                {item.isPriceAnalysisItem ? '-' : `${percentage.toFixed(1)}%`}
                              </td>
                              <td className="border border-slate-800 p-2 text-xs text-slate-500"></td>
                            </tr>
                          );
                        })}
                        {/* Subtotal row */}
                        <tr className="bg-yellow-200 font-bold">
                          <td colSpan={4} className="border border-slate-800 p-2 text-center text-blue-700">
                            {catKey === '其他' ? '其他' : `${catKey}.${CATEGORIES[catKey]}`}-合計
                          </td>
                          <td className="border border-slate-800 p-2 text-right font-mono">{catTotal.toLocaleString()}</td>
                          {showActualCost && (
                            <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-100/50">{catTotalActual.toLocaleString()}</td>
                          )}
                          <td className="border border-slate-800 p-2 text-right font-mono">{totalPing.toLocaleString()}</td>
                          <td className="border border-slate-800 p-2 text-right font-mono text-red-600">
                            {totalPing > 0 ? Math.round(catTotal / totalPing).toLocaleString() : 0}
                          </td>
                          {showActualCost && (
                            <td className="border border-slate-800 p-2 text-right font-mono text-emerald-700 bg-emerald-100/50">
                              {totalPing > 0 ? Math.round(catTotalActual / totalPing).toLocaleString() : 0}
                            </td>
                          )}
                          <td className="border border-slate-800 p-2 text-right font-mono text-blue-600">
                            {grandTotal > 0 ? ((catTotal / grandTotal) * 100).toFixed(1) : 0}%
                          </td>
                          <td className="border border-slate-800 p-2"></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* Grand Totals */}
                  {items.length > 0 && (
                    <>
                      <tr className="bg-yellow-300 font-bold text-base">
                        <td colSpan={4} className="border border-slate-800 p-3 text-center text-red-600">
                          (一~六)直接成本小計(未稅)
                        </td>
                        <td className="border border-slate-800 p-3 text-right font-mono">{grandTotal.toLocaleString()}</td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-3 text-right font-mono bg-emerald-100/50">{grandTotalActual.toLocaleString()}</td>
                        )}
                        <td className="border border-slate-800 p-3 text-right font-mono">{totalPing.toLocaleString()}</td>
                        <td className="border border-slate-800 p-3 text-right font-mono text-red-600">
                          {totalPing > 0 ? Math.round(grandTotal / totalPing).toLocaleString() : 0}
                        </td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-3 text-right font-mono text-emerald-700 bg-emerald-100/50">
                            {totalPing > 0 ? Math.round(grandTotalActual / totalPing).toLocaleString() : 0}
                          </td>
                        )}
                        <td className="border border-slate-800 p-3 text-right font-mono text-blue-600">
                          100.0%
                        </td>
                        <td className="border border-slate-800 p-3"></td>
                      </tr>
                      
                      <tr className="bg-white">
                        <td colSpan={4} className="border border-slate-800 p-2 text-center">
                          七.工地人事管銷
                        </td>
                        <td className="border border-slate-800 p-2 text-right font-mono">{Math.round(hrFee).toLocaleString()}</td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-50/50">{Math.round(hrFeeActual).toLocaleString()}</td>
                        )}
                        <td className="border border-slate-800 p-2 text-right font-mono">{totalPing.toLocaleString()}</td>
                        <td className="border border-slate-800 p-2 text-right font-mono">
                          {totalPing > 0 ? Math.round(hrFee / totalPing).toLocaleString() : 0}
                        </td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-50/50">
                            {totalPing > 0 ? Math.round(hrFeeActual / totalPing).toLocaleString() : 0}
                          </td>
                        )}
                        <td className="border border-slate-800 p-2 text-right font-mono text-blue-600">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-16 text-right border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={hrFeePercent}
                              onChange={handleHrFeePercentChange}
                            />
                            <span>%</span>
                          </div>
                        </td>
                        <td className="border border-slate-800 p-2"></td>
                      </tr>

                      <tr className="bg-white">
                        <td colSpan={4} className="border border-slate-800 p-2 text-center">
                          八.管理費及利潤
                        </td>
                        <td className="border border-slate-800 p-2 text-right font-mono">{Math.round(managementFee).toLocaleString()}</td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-50/50">{Math.round(managementFeeActual).toLocaleString()}</td>
                        )}
                        <td className="border border-slate-800 p-2 text-right font-mono">{totalPing.toLocaleString()}</td>
                        <td className="border border-slate-800 p-2 text-right font-mono">
                          {totalPing > 0 ? Math.round(managementFee / totalPing).toLocaleString() : 0}
                        </td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-50/50">
                            {totalPing > 0 ? Math.round(managementFeeActual / totalPing).toLocaleString() : 0}
                          </td>
                        )}
                        <td className="border border-slate-800 p-2 text-right font-mono text-blue-600">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              className="w-16 text-right border border-slate-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              value={managementFeePercent}
                              onChange={handleManagementFeePercentChange}
                            />
                            <span>%</span>
                          </div>
                        </td>
                        <td className="border border-slate-800 p-2"></td>
                      </tr>

                      <tr className="bg-red-50 font-bold">
                        <td colSpan={4} className="border border-slate-800 p-2 text-center text-red-600">
                          合計(未稅)
                        </td>
                        <td className="border border-slate-800 p-2 text-right font-mono">{Math.round(totalNoTax).toLocaleString()}</td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-50/50">{Math.round(totalNoTaxActual).toLocaleString()}</td>
                        )}
                        <td className="border border-slate-800 p-2 text-right font-mono">{totalPing.toLocaleString()}</td>
                        <td className="border border-slate-800 p-2 text-right font-mono">
                          {totalPing > 0 ? Math.round(totalNoTax / totalPing).toLocaleString() : 0}
                        </td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-2 text-right font-mono bg-emerald-50/50">
                            {totalPing > 0 ? Math.round(totalNoTaxActual / totalPing).toLocaleString() : 0}
                          </td>
                        )}
                        <td className="border border-slate-800 p-2"></td>
                        <td className="border border-slate-800 p-2"></td>
                      </tr>

                      <tr className="bg-red-100 font-bold text-base">
                        <td colSpan={4} className="border border-slate-800 p-3 text-center text-red-600">
                          合計(含稅)
                        </td>
                        <td className="border border-slate-800 p-3 text-right font-mono">{Math.round(totalWithTax).toLocaleString()}</td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-3 text-right font-mono bg-emerald-100/50">{Math.round(totalWithTaxActual).toLocaleString()}</td>
                        )}
                        <td className="border border-slate-800 p-3 text-right font-mono">{totalPing.toLocaleString()}</td>
                        <td className="border border-slate-800 p-3 text-right font-mono text-red-600">
                          {totalPing > 0 ? Math.round(totalWithTax / totalPing).toLocaleString() : 0}
                        </td>
                        {showActualCost && (
                          <td className="border border-slate-800 p-3 text-right font-mono text-emerald-700 bg-emerald-100/50">
                            {totalPing > 0 ? Math.round(totalWithTaxActual / totalPing).toLocaleString() : 0}
                          </td>
                        )}
                        <td className="border border-slate-800 p-3"></td>
                        <td className="border border-slate-800 p-3"></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            
            {items.length === 0 && !isLoading && (
              <div className="text-center py-12 text-slate-500">
                目前沒有成本項目資料，請先至「成本項目管理」新增資料。
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
