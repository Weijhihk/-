import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Upload, Download, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface PriceAnalysisItem {
  refItemId: string;
  coefficient: number;
}

interface CostItem {
  id: string;
  itemNumber: string; // 編號
  name: string;       // 項目名稱
  unit: string;       // 單位
  budgetQuantity: number;   // 預算數量
  budgetUnitPrice: number;  // 預算單價
  actualQuantity: number;   // 實際數量
  actualUnitPrice: number;  // 實際單價
  roundTotal?: boolean;     // 複價四捨五入至整數
  hasPriceAnalysis?: boolean; // 啟用單價分析
  priceMultiplier?: number;   // 單價乘數
  priceAnalysisItems?: PriceAnalysisItem[]; // 分析項目組成
  isPriceAnalysisItem?: boolean; // 作為單價分析子項目
}

export const getCalculatedBudgetUnitPrice = (item: Partial<CostItem>, allItems: CostItem[], visited = new Set<string>()): number => {
  if (!item.hasPriceAnalysis || !item.priceAnalysisItems) return item.budgetUnitPrice || 0;
  if (item.id && visited.has(item.id)) return 0; // Prevent circular reference
  
  if (item.id) visited.add(item.id);
  const basePrice = item.priceAnalysisItems.reduce((sum, analysisItem) => {
    const refItem = allItems.find(i => i.id === analysisItem.refItemId);
    const refPrice = refItem ? getCalculatedBudgetUnitPrice(refItem, allItems, visited) : 0;
    return sum + Math.round(refPrice * analysisItem.coefficient);
  }, 0);
  if (item.id) visited.delete(item.id);
  
  return Math.round(basePrice * (item.priceMultiplier ?? 1));
};

export const getBudgetTotal = (item: CostItem, allItems: CostItem[]) => {
  if (item.isPriceAnalysisItem) return 0;
  const unitPrice = getCalculatedBudgetUnitPrice(item, allItems);
  const total = item.budgetQuantity * unitPrice;
  return item.roundTotal ? Math.round(total) : total;
};

export const getActualTotal = (item: CostItem) => {
  if (item.isPriceAnalysisItem) return 0;
  const total = item.actualQuantity * item.actualUnitPrice;
  return item.roundTotal ? Math.round(total) : total;
};

export default function CostItemManagement() {
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const [importProgress, setImportProgress] = useState<number | null>(null);

  const showAlert = (title: string, message: string) => {
    setAlertModal({ isOpen: true, title, message });
  };

  const [formData, setFormData] = useState<Omit<CostItem, 'id'>>({
    itemNumber: '',
    name: '',
    unit: '',
    budgetQuantity: 0,
    budgetUnitPrice: 0,
    actualQuantity: 0,
    actualUnitPrice: 0,
    roundTotal: false,
    hasPriceAnalysis: false,
    priceMultiplier: 1,
    priceAnalysisItems: [],
    isPriceAnalysisItem: false,
  });

  useEffect(() => {
    fetch('/api/cost-items')
      .then(res => res.json())
      .then(data => {
        setCostItems(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch cost items:', err);
        setIsLoading(false);
      });
  }, []);

  const filteredItems = costItems
    .filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemNumber.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));

  const handleOpenModal = (item?: CostItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        itemNumber: item.itemNumber,
        name: item.name,
        unit: item.unit,
        budgetQuantity: item.budgetQuantity,
        budgetUnitPrice: item.budgetUnitPrice,
        actualQuantity: item.actualQuantity,
        actualUnitPrice: item.actualUnitPrice,
        roundTotal: item.roundTotal || false,
        hasPriceAnalysis: item.hasPriceAnalysis || false,
        priceMultiplier: item.priceMultiplier ?? 1,
        priceAnalysisItems: item.priceAnalysisItems || [],
        isPriceAnalysisItem: item.isPriceAnalysisItem || false,
      });
    } else {
      setEditingItem(null);
      setFormData({
        itemNumber: '',
        name: '',
        unit: '',
        budgetQuantity: 0,
        budgetUnitPrice: 0,
        actualQuantity: 0,
        actualUnitPrice: 0,
        roundTotal: false,
        hasPriceAnalysis: false,
        priceMultiplier: 1,
        priceAnalysisItems: [],
        isPriceAnalysisItem: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.itemNumber.trim()) return;

    try {
      if (editingItem) {
        const updatedItem = { 
          ...formData, 
          id: editingItem.id,
          budgetUnitPrice: formData.hasPriceAnalysis ? getCalculatedBudgetUnitPrice(formData, costItems) : formData.budgetUnitPrice
        };
        await fetch(`/api/cost-items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedItem)
        });
        setCostItems(costItems.map(t => t.id === editingItem.id ? updatedItem : t));
      } else {
        const newItem: CostItem = {
          ...formData,
          id: Date.now().toString(),
          budgetUnitPrice: formData.hasPriceAnalysis ? getCalculatedBudgetUnitPrice(formData, costItems) : formData.budgetUnitPrice
        };
        await fetch('/api/cost-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        });
        setCostItems([...costItems, newItem]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save item:', error);
      showAlert('錯誤', '儲存失敗，請稍後再試。');
    }
  };

  const handleDeleteItem = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '確認刪除',
      message: '確定要刪除此項目嗎？刪除後將無法復原。',
      onConfirm: async () => {
        try {
          await fetch(`/api/cost-items/${id}`, { method: 'DELETE' });
          setCostItems(prev => prev.filter(t => t.id !== id));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Failed to delete item:', error);
          showAlert('錯誤', '刪除失敗，請稍後再試。');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
      onCancel: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // CSV 匯出功能
  const handleExportCSV = () => {
    const headers = ['編號', '項目名稱', '單位', '預算數量', '預算單價', '預算複價', '實際數量', '實際單價', '實際複價', '差異金額'];
    const csvContent = [
      headers.join(','),
      ...costItems.map(item => {
        const safeName = item.name.includes(',') ? `"${item.name}"` : item.name;
        const unitPrice = getCalculatedBudgetUnitPrice(item, costItems);
        const budgetTotal = getBudgetTotal(item, costItems);
        const actualTotal = getActualTotal(item);
        const diff = budgetTotal - actualTotal;
        return [
          item.itemNumber, safeName, item.unit, 
          item.budgetQuantity, unitPrice, item.isPriceAnalysisItem ? 0 : budgetTotal,
          item.actualQuantity, item.actualUnitPrice, item.isPriceAnalysisItem ? 0 : actualTotal, item.isPriceAnalysisItem ? 0 : diff
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `成本項目清單_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const result: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentCell);
        if (currentRow.some(cell => cell.trim() !== '')) result.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\r' && !inQuotes) {
        // skip \r
      } else {
        currentCell += char;
      }
    }
    
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell);
      if (currentRow.some(cell => cell.trim() !== '')) result.push(currentRow);
    }

    return result.map(row => row.map(cell => cell.trim()));
  };

  // CSV 匯入功能
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(buffer);
      
      let text = '';
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        text = decoder.decode(uint8Array);
      } catch (e) {
        // Fallback to Big5 if UTF-8 fails
        const decoder = new TextDecoder('big5');
        text = decoder.decode(uint8Array);
      }

      const rows = parseCSV(text);
      
      if (rows.length <= 1) {
        showAlert('錯誤', 'CSV 檔案格式錯誤或沒有資料');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const parsedItems: Partial<CostItem>[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 5) {
          parsedItems.push({
            itemNumber: row[0] || '',
            name: row[1] || '',
            unit: row[2] || '',
            budgetQuantity: Number((row[3] || '').replace(/,/g, '')) || 0,
            budgetUnitPrice: Number((row[4] || '').replace(/,/g, '')) || 0,
            actualQuantity: Number((row[6] || '').replace(/,/g, '')) || 0,
            actualUnitPrice: Number((row[7] || '').replace(/,/g, '')) || 0,
          });
        }
      }

      if (parsedItems.length === 0) {
        showAlert('錯誤', '無法解析 CSV 資料，請確認格式是否正確。');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Check for duplicates
      const existingItemNumbers = new Set(costItems.map(item => item.itemNumber));
      const duplicates = parsedItems.filter(item => item.itemNumber && existingItemNumbers.has(item.itemNumber));

      const processImport = async (overwrite: boolean) => {
        try {
          const itemsToUpdate: CostItem[] = [];
          const itemsToInsert: CostItem[] = [];

          parsedItems.forEach((parsedItem, index) => {
            if (!parsedItem.itemNumber) return;
            const existingItem = costItems.find(item => item.itemNumber === parsedItem.itemNumber);
            if (existingItem) {
              if (overwrite) {
                itemsToUpdate.push({ ...existingItem, ...parsedItem, id: existingItem.id } as CostItem);
              }
            } else {
              itemsToInsert.push({ ...parsedItem, id: Date.now().toString() + '-' + index } as CostItem);
            }
          });

          const totalOperations = itemsToUpdate.length + (itemsToInsert.length > 0 ? 1 : 0);
          let completedOperations = 0;
          
          if (totalOperations > 0) {
            setImportProgress(0);
          }

          // Update existing items
          for (const item of itemsToUpdate) {
            await fetch(`/api/cost-items/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            });
            completedOperations++;
            setImportProgress(Math.round((completedOperations / totalOperations) * 100));
          }

          // Insert new items
          if (itemsToInsert.length > 0) {
            await fetch('/api/cost-items/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(itemsToInsert)
            });
            completedOperations++;
            setImportProgress(Math.round((completedOperations / totalOperations) * 100));
          }

          // Refresh data
          const res = await fetch('/api/cost-items');
          const data = await res.json();
          setCostItems(data);
          
          setImportProgress(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          showAlert('成功', `成功匯入資料！新增 ${itemsToInsert.length} 筆，更新 ${itemsToUpdate.length} 筆。`);
        } catch (err) {
          console.error('Failed to import CSV:', err);
          setImportProgress(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          showAlert('錯誤', '匯入失敗，請稍後再試。');
        }
      };

      if (duplicates.length > 0) {
        setConfirmModal({
          isOpen: true,
          title: '發現重複的編號',
          message: `匯入的資料中有 ${duplicates.length} 筆編號已經存在。請問是否要覆蓋原有資料？\n(若選擇取消，將放棄此次匯入)`,
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            processImport(true);
          },
          onCancel: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            if (fileInputRef.current) fileInputRef.current.value = '';
          }
        });
      } else {
        processImport(false);
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const calculateTotalBudget = () => {
    return costItems.reduce((sum, item) => sum + getBudgetTotal(item, costItems), 0);
  };

  const calculateTotalActual = () => {
    return costItems.reduce((sum, item) => sum + getActualTotal(item), 0);
  };

  const totalBudget = calculateTotalBudget();
  const totalActual = calculateTotalActual();
  const totalDiff = totalBudget - totalActual;

  const getFontSizeClass = (value: number) => {
    const length = value.toLocaleString().length;
    if (length > 15) return 'text-xl';
    if (length > 12) return 'text-2xl';
    return 'text-3xl';
  };

  return (
    <div className="h-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">成本項目管理</h1>
              <p className="text-sm text-slate-500 mt-1">管理工程項目、預算與實際花費</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none sm:w-48">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="搜尋編號或名稱..."
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center px-3 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  title="匯入 CSV"
                >
                  <Upload className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">匯入 CSV</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center justify-center px-3 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  title="匯出 CSV"
                >
                  <Download className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">匯出 CSV</span>
                </button>
                <button
                  onClick={() => handleOpenModal()}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  新增項目
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-full mx-auto space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-5">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                <h3 className="font-medium">總項目數</h3>
              </div>
              <p className="text-3xl font-bold text-slate-900">{costItems.length} <span className="text-base font-normal text-slate-500">項</span></p>
            </div>
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-5">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xs">$</span>
                </div>
                <h3 className="font-medium">總預算金額</h3>
              </div>
              <p className={`font-bold text-slate-900 ${getFontSizeClass(totalBudget)}`}>
                ${totalBudget.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-5">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 font-bold text-xs">$</span>
                </div>
                <h3 className="font-medium">總實際花費</h3>
              </div>
              <p className={`font-bold text-slate-900 ${getFontSizeClass(totalActual)}`}>
                ${totalActual.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-5">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center ${totalDiff >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                  <span className={`font-bold text-xs ${totalDiff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>±</span>
                </div>
                <h3 className="font-medium">總差異金額</h3>
              </div>
              <p className={`font-bold ${totalDiff >= 0 ? 'text-blue-600' : 'text-red-600'} ${getFontSizeClass(totalDiff)}`}>
                {totalDiff > 0 ? '+' : ''}{totalDiff.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6 w-20">
                      編號
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                      項目名稱
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900 w-16">
                      單位
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-24">
                      預算數量
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-28">
                      預算單價
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-32 bg-slate-100/50">
                      預算複價
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-24">
                      實際數量
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-28">
                      實際單價
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-32 bg-slate-100/50">
                      實際複價
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900 w-32">
                      差異金額
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 w-16">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const unitPrice = getCalculatedBudgetUnitPrice(item, costItems);
                      const budgetTotal = getBudgetTotal(item, costItems);
                      const actualTotal = getActualTotal(item);
                      const diff = budgetTotal - actualTotal;
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                            {item.isPriceAnalysisItem && <span className="text-red-500 mr-1" title="單價分析子項目">*</span>}
                            {item.itemNumber}
                          </td>
                          <td className="py-4 px-3 text-sm text-slate-900">
                            {item.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                            {item.unit}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-mono">
                            {item.budgetQuantity.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-mono">
                            ${unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-slate-700 text-right font-mono bg-slate-50">
                            {item.isPriceAnalysisItem ? '-' : `$${budgetTotal.toLocaleString()}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-mono">
                            {item.actualQuantity.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 text-right font-mono">
                            ${item.actualUnitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-slate-700 text-right font-mono bg-slate-50">
                            {item.isPriceAnalysisItem ? '-' : `$${actualTotal.toLocaleString()}`}
                          </td>
                          <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold text-right font-mono ${diff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {item.isPriceAnalysisItem ? '-' : `${diff > 0 ? '+' : ''}${diff.toLocaleString()}`}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenModal(item)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                                title="編輯"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                title="刪除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <AlertCircle className="h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-sm">找不到符合的項目</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={handleCloseModal}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
              <form onSubmit={handleSaveItem}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg leading-6 font-semibold text-slate-900" id="modal-title">
                      {editingItem ? '編輯項目' : '新增項目'}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="bg-white rounded-md text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <span className="sr-only">關閉</span>
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* 基本資料 */}
                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-4">
                      <div className="sm:col-span-1">
                        <label htmlFor="itemNumber" className="block text-sm font-medium text-slate-700">
                          編號 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="itemNumber"
                          id="itemNumber"
                          required
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.itemNumber}
                          onChange={(e) => setFormData({ ...formData, itemNumber: e.target.value })}
                          placeholder="例如: A01"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                          項目名稱 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          required
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="輸入項目名稱"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label htmlFor="unit" className="block text-sm font-medium text-slate-700">
                          單位
                        </label>
                        <input
                          type="text"
                          name="unit"
                          id="unit"
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          placeholder="例如: 式, M3"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="roundTotal"
                          checked={formData.roundTotal || false}
                          onChange={(e) => setFormData({ ...formData, roundTotal: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                        />
                        <label htmlFor="roundTotal" className="ml-2 block text-sm text-slate-900">
                          複價四捨五入至整數
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="hasPriceAnalysis"
                          checked={formData.hasPriceAnalysis || false}
                          onChange={(e) => setFormData({ ...formData, hasPriceAnalysis: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                        />
                        <label htmlFor="hasPriceAnalysis" className="ml-2 block text-sm text-slate-900">
                          啟用單價分析 (由其他項目組成)
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isPriceAnalysisItem"
                          checked={formData.isPriceAnalysisItem || false}
                          onChange={(e) => setFormData({ ...formData, isPriceAnalysisItem: e.target.checked })}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 rounded"
                        />
                        <label htmlFor="isPriceAnalysisItem" className="ml-2 block text-sm text-slate-900">
                          設定為單價分析子項目 (不計入總計)
                        </label>
                      </div>
                    </div>

                    {formData.hasPriceAnalysis && (
                      <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-indigo-900 flex items-center">
                            <div className="w-1 h-4 bg-indigo-500 rounded mr-2"></div>
                            單價分析設定
                          </h4>
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700">單價乘數:</label>
                            <input
                              type="number"
                              step="0.001"
                              value={formData.priceMultiplier ?? 1}
                              onChange={(e) => setFormData({ ...formData, priceMultiplier: Number(e.target.value) })}
                              className="block w-24 border border-slate-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder="例如 1.07"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {(formData.priceAnalysisItems || []).map((analysisItem, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <div className="flex-1 min-w-0">
                                <select
                                  value={analysisItem.refItemId}
                                  onChange={(e) => {
                                    const newItems = [...(formData.priceAnalysisItems || [])];
                                    newItems[index].refItemId = e.target.value;
                                    setFormData({ ...formData, priceAnalysisItems: newItems });
                                  }}
                                  className="w-full border border-slate-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                  <option value="">選擇參考項目...</option>
                                  {costItems.filter(i => i.id !== editingItem?.id).map(i => (
                                    <option key={i.id} value={i.id}>{i.itemNumber} - {i.name} (${getCalculatedBudgetUnitPrice(i, costItems).toLocaleString(undefined, { maximumFractionDigits: 2 })})</option>
                                  ))}
                                </select>
                              </div>
                              <span className="text-slate-500 text-sm flex-shrink-0">×</span>
                              <input
                                type="number"
                                step="0.0001"
                                placeholder="用量/係數"
                                value={analysisItem.coefficient}
                                onChange={(e) => {
                                  const newItems = [...(formData.priceAnalysisItems || [])];
                                  newItems[index].coefficient = Number(e.target.value);
                                  setFormData({ ...formData, priceAnalysisItems: newItems });
                                }}
                                className="w-24 flex-shrink-0 border border-slate-300 rounded-md shadow-sm py-1.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = [...(formData.priceAnalysisItems || [])];
                                  newItems.splice(index, 1);
                                  setFormData({ ...formData, priceAnalysisItems: newItems });
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...(formData.priceAnalysisItems || []), { refItemId: '', coefficient: 1 }];
                              setFormData({ ...formData, priceAnalysisItems: newItems });
                            }}
                            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900 mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            新增分析項目
                          </button>
                        </div>
                        
                        <div className="pt-3 border-t border-indigo-100 flex justify-end items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">試算預算單價：</span>
                          <span className="text-lg font-bold text-indigo-700">
                            ${getCalculatedBudgetUnitPrice(formData as CostItem, costItems).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 預算區塊 */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                          <div className="w-1 h-4 bg-blue-500 rounded mr-2"></div>
                          預算設定
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="budgetQuantity" className="block text-sm font-medium text-slate-700">
                              預算數量
                            </label>
                            <input
                              type="number"
                              name="budgetQuantity"
                              id="budgetQuantity"
                              min="0"
                              step="any"
                              className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              value={formData.budgetQuantity}
                              onChange={(e) => setFormData({ ...formData, budgetQuantity: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label htmlFor="budgetUnitPrice" className="block text-sm font-medium text-slate-700">
                              預算單價
                            </label>
                            <input
                              type="number"
                              name="budgetUnitPrice"
                              id="budgetUnitPrice"
                              min="0"
                              step="any"
                              disabled={formData.hasPriceAnalysis}
                              className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                              value={formData.hasPriceAnalysis ? getCalculatedBudgetUnitPrice(formData as CostItem, costItems) : formData.budgetUnitPrice}
                              onChange={(e) => setFormData({ ...formData, budgetUnitPrice: Number(e.target.value) })}
                            />
                          </div>
                          <div className="pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-700">預算複價</span>
                              <span className="text-lg font-bold text-slate-900">
                                ${getBudgetTotal(formData as CostItem, costItems).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 實際區塊 */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                          <div className="w-1 h-4 bg-emerald-500 rounded mr-2"></div>
                          實際花費
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="actualQuantity" className="block text-sm font-medium text-slate-700">
                              實際數量
                            </label>
                            <input
                              type="number"
                              name="actualQuantity"
                              id="actualQuantity"
                              min="0"
                              step="any"
                              className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                              value={formData.actualQuantity}
                              onChange={(e) => setFormData({ ...formData, actualQuantity: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label htmlFor="actualUnitPrice" className="block text-sm font-medium text-slate-700">
                              實際單價
                            </label>
                            <input
                              type="number"
                              name="actualUnitPrice"
                              id="actualUnitPrice"
                              min="0"
                              step="any"
                              className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                              value={formData.actualUnitPrice}
                              onChange={(e) => setFormData({ ...formData, actualUnitPrice: Number(e.target.value) })}
                            />
                          </div>
                          <div className="pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-700">實際複價</span>
                              <span className="text-lg font-bold text-slate-900">
                                ${getActualTotal(formData as CostItem).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 差異計算 */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-sm font-medium text-slate-700">差異金額 (預算 - 實際)</span>
                        <span className={`text-xl font-bold ${
                          getBudgetTotal(formData as CostItem, costItems) - getActualTotal(formData as CostItem) >= 0 
                            ? 'text-blue-600' 
                            : 'text-red-600'
                        }`}>
                          {getBudgetTotal(formData as CostItem, costItems) - getActualTotal(formData as CostItem) > 0 ? '+' : ''}
                          {(getBudgetTotal(formData as CostItem, costItems) - getActualTotal(formData as CostItem)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    儲存
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="confirm-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={confirmModal.onCancel}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-slate-900" id="confirm-modal-title">
                      {confirmModal.title}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-500 whitespace-pre-line">
                        {confirmModal.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmModal.onConfirm}
                >
                  確定
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmModal.onCancel}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="alert-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-slate-900" id="alert-modal-title">
                      {alertModal.title}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-500">
                        {alertModal.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Progress Modal */}
      {importProgress !== null && (
        <div className="fixed inset-0 z-[70] overflow-y-auto" aria-labelledby="progress-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-slate-900 mb-4" id="progress-modal-title">
                      資料匯入中...
                    </h3>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                      <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }}></div>
                    </div>
                    <p className="text-sm text-slate-500 text-right">
                      {importProgress}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
