import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Calendar, Clock, CheckCircle2, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  plannedStartDate: string;
  actualStartDate: string;
  plannedEndDate: string;
  actualEndDate: string;
  parentId: string | null;
  sortOrder: number;
}

interface CostItem {
  id: string;
  itemNumber: string;
  name: string;
  unit: string;
  budgetQuantity: number;
  budgetUnitPrice: number;
  actualQuantity: number;
  actualUnitPrice: number;
  subItemId: string | null;
}

export default function SubItemProgress() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTaskForNew, setParentTaskForNew] = useState<Task | null>(null);

  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [selectedTaskForCost, setSelectedTaskForCost] = useState<Task | null>(null);
  const [selectedCostItemIds, setSelectedCostItemIds] = useState<Set<string>>(new Set());

  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    name: '',
    plannedStartDate: '',
    actualStartDate: '',
    plannedEndDate: '',
    actualEndDate: '',
    parentId: null,
    sortOrder: 0,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/sub-items').then(res => res.json()),
      fetch('/api/cost-items').then(res => res.json())
    ])
      .then(([tasksData, costItemsData]) => {
        setTasks(tasksData);
        setCostItems(costItemsData);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data:', err);
        setIsLoading(false);
      });
  }, []);

  const getDerivedDates = (taskId: string, allTasks: Task[]): Partial<Task> | null => {
    const children = allTasks.filter(t => t.parentId === taskId);
    if (children.length === 0) return null;

    let minPlannedStart = '';
    let maxPlannedEnd = '';
    let minActualStart = '';
    let maxActualEnd = '';

    children.forEach(child => {
      const childDates = getDerivedDates(child.id, allTasks) || child;
      
      if (childDates.plannedStartDate && (!minPlannedStart || childDates.plannedStartDate < minPlannedStart)) {
        minPlannedStart = childDates.plannedStartDate;
      }
      if (childDates.plannedEndDate && (!maxPlannedEnd || childDates.plannedEndDate > maxPlannedEnd)) {
        maxPlannedEnd = childDates.plannedEndDate;
      }
      if (childDates.actualStartDate && (!minActualStart || childDates.actualStartDate < minActualStart)) {
        minActualStart = childDates.actualStartDate;
      }
      if (childDates.actualEndDate && (!maxActualEnd || childDates.actualEndDate > maxActualEnd)) {
        maxActualEnd = childDates.actualEndDate;
      }
    });

    return {
      plannedStartDate: minPlannedStart,
      plannedEndDate: maxPlannedEnd,
      actualStartDate: minActualStart,
      actualEndDate: maxActualEnd,
    };
  };

  const getTaskDisplayDates = (task: Task) => {
    const derived = getDerivedDates(task.id, tasks);
    if (derived) {
      return { ...task, ...derived };
    }
    return task;
  };

  const getMatchingTaskIds = () => {
    const matchingIds = new Set<string>();
    const matchTaskAndParents = (taskId: string) => {
      matchingIds.add(taskId);
      const task = tasks.find(t => t.id === taskId);
      if (task && task.parentId) {
        matchTaskAndParents(task.parentId);
      }
    };
    
    tasks.forEach(task => {
      if (task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        matchTaskAndParents(task.id);
      }
    });
    return matchingIds;
  };

  const matchingIds = getMatchingTaskIds();

  const buildTree = (parentId: string | null, level: number = 0, wbsPrefix: string = ''): (Task & { level: number, wbs: string })[] => {
    const children = tasks
      .filter(t => t.parentId === parentId && matchingIds.has(t.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);
      
    let result: (Task & { level: number, wbs: string })[] = [];
    children.forEach((child, index) => {
      const currentWbs = wbsPrefix ? `${wbsPrefix}.${index + 1}` : `${index + 1}`;
      result.push({ ...child, level, wbs: currentWbs });
      result = result.concat(buildTree(child.id, level + 1, currentWbs));
    });
    return result;
  };

  const flattenedTasks = buildTree(null);

  const handleOpenModal = (task?: Task, parentTask?: Task) => {
    if (task) {
      setEditingTask(task);
      setParentTaskForNew(null);
      setFormData({
        name: task.name,
        plannedStartDate: task.plannedStartDate || '',
        actualStartDate: task.actualStartDate || '',
        plannedEndDate: task.plannedEndDate || '',
        actualEndDate: task.actualEndDate || '',
        parentId: task.parentId || null,
        sortOrder: task.sortOrder || 0,
      });
    } else {
      setEditingTask(null);
      setParentTaskForNew(parentTask || null);
      
      // Calculate next sortOrder for new task
      const siblings = tasks.filter(t => t.parentId === (parentTask ? parentTask.id : null));
      const nextSortOrder = siblings.length > 0 ? Math.max(...siblings.map(s => s.sortOrder || 0)) + 1 : 0;

      setFormData({
        name: '',
        plannedStartDate: '',
        actualStartDate: '',
        plannedEndDate: '',
        actualEndDate: '',
        parentId: parentTask ? parentTask.id : null,
        sortOrder: nextSortOrder,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setParentTaskForNew(null);
  };

  const handleOpenCostModal = (task: Task) => {
    setSelectedTaskForCost(task);
    const assignedIds = new Set(costItems.filter(c => c.subItemId === task.id).map(c => c.id));
    setSelectedCostItemIds(assignedIds);
    setIsCostModalOpen(true);
  };

  const handleCloseCostModal = () => {
    setIsCostModalOpen(false);
    setSelectedTaskForCost(null);
  };

  const handleSaveCostItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForCost) return;

    try {
      const previousAssigned = costItems.filter(c => c.subItemId === selectedTaskForCost.id);
      const updates: Promise<any>[] = [];

      previousAssigned.forEach(item => {
        if (!selectedCostItemIds.has(item.id)) {
          updates.push(fetch(`/api/cost-items/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, subItemId: null })
          }));
        }
      });

      selectedCostItemIds.forEach(id => {
        if (!previousAssigned.find(c => c.id === id)) {
          const item = costItems.find(c => c.id === id);
          if (item) {
            updates.push(fetch(`/api/cost-items/${item.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...item, subItemId: selectedTaskForCost.id })
            }));
          }
        }
      });

      await Promise.all(updates);
      
      const res = await fetch('/api/cost-items');
      const data = await res.json();
      setCostItems(data);
      
      handleCloseCostModal();
    } catch (error) {
      console.error('Failed to save cost items:', error);
      setAlertMessage('儲存失敗，請稍後再試。');
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingTask) {
        const updatedTask = { ...formData, id: editingTask.id };
        await fetch(`/api/sub-items/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTask)
        });
        setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));
      } else {
        const newTask: Task = {
          ...formData,
          id: Date.now().toString(),
        };
        await fetch('/api/sub-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        });
        setTasks([...tasks, newTask]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save task:', error);
      setAlertMessage('儲存失敗，請稍後再試。');
    }
  };

  const handleDeleteTaskRequest = (id: string) => {
    const hasChildren = tasks.some(t => t.parentId === id);
    if (hasChildren) {
      setAlertMessage('請先刪除所有子任務，才能刪除此任務。');
      return;
    }
    setTaskToDelete(id);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    const id = taskToDelete;
    
    try {
      // Unassign cost items
      const assignedCostItems = costItems.filter(c => c.subItemId === id);
      const updates = assignedCostItems.map(item => 
        fetch(`/api/cost-items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, subItemId: null })
        })
      );
      await Promise.all(updates);

      await fetch(`/api/sub-items/${id}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== id));
      
      // Refresh cost items
      if (assignedCostItems.length > 0) {
        const res = await fetch('/api/cost-items');
        const data = await res.json();
        setCostItems(data);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      setAlertMessage('刪除失敗，請稍後再試。');
    } finally {
      setTaskToDelete(null);
    }
  };

  const getStatusColor = (task: Task) => {
    if (task.actualEndDate) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (task.actualStartDate) return 'bg-blue-100 text-blue-800 border-blue-200';
    
    // Check if overdue
    if (task.plannedStartDate && new Date(task.plannedStartDate) < new Date() && !task.actualStartDate) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getStatusText = (task: Task) => {
    if (task.actualEndDate) return '已完成';
    if (task.actualStartDate) return '進行中';
    if (task.plannedStartDate && new Date(task.plannedStartDate) < new Date() && !task.actualStartDate) return '已延遲';
    return '未開始';
  };

  const getTaskCost = (taskId: string): number => {
    // Find all descendant task IDs
    const descendantIds = new Set<string>();
    const findDescendants = (id: string) => {
      descendantIds.add(id);
      tasks.filter(t => t.parentId === id).forEach(child => findDescendants(child.id));
    };
    findDescendants(taskId);

    // Sum budget costs of all cost items assigned to this task or its descendants
    let totalCost = 0;
    costItems.forEach(item => {
      if (item.subItemId && descendantIds.has(item.subItemId)) {
        totalCost += (item.budgetQuantity || 0) * (item.budgetUnitPrice || 0);
      }
    });
    return totalCost;
  };

  const handleMoveTask = async (task: Task, direction: 'up' | 'down') => {
    const siblings = tasks
      .filter(t => t.parentId === task.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    
    const currentIndex = siblings.findIndex(t => t.id === task.id);
    if (currentIndex === -1) return;
    
    if (direction === 'up' && currentIndex > 0) {
      const prevTask = siblings[currentIndex - 1];
      const newTasks = [...tasks];
      
      const taskIndex = newTasks.findIndex(t => t.id === task.id);
      const prevTaskIndex = newTasks.findIndex(t => t.id === prevTask.id);
      
      const tempOrder = newTasks[taskIndex].sortOrder;
      newTasks[taskIndex].sortOrder = newTasks[prevTaskIndex].sortOrder;
      newTasks[prevTaskIndex].sortOrder = tempOrder;
      
      setTasks(newTasks);
      
      // Update backend
      await fetch('/api/sub-items-batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { id: task.id, sortOrder: newTasks[taskIndex].sortOrder },
          { id: prevTask.id, sortOrder: newTasks[prevTaskIndex].sortOrder }
        ])
      });
    } else if (direction === 'down' && currentIndex < siblings.length - 1) {
      const nextTask = siblings[currentIndex + 1];
      const newTasks = [...tasks];
      
      const taskIndex = newTasks.findIndex(t => t.id === task.id);
      const nextTaskIndex = newTasks.findIndex(t => t.id === nextTask.id);
      
      const tempOrder = newTasks[taskIndex].sortOrder;
      newTasks[taskIndex].sortOrder = newTasks[nextTaskIndex].sortOrder;
      newTasks[nextTaskIndex].sortOrder = tempOrder;
      
      setTasks(newTasks);
      
      // Update backend
      await fetch('/api/sub-items-batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { id: task.id, sortOrder: newTasks[taskIndex].sortOrder },
          { id: nextTask.id, sortOrder: newTasks[nextTaskIndex].sortOrder }
        ])
      });
    }
  };

  const hasChildren = editingTask ? tasks.some(t => t.parentId === editingTask.id) : false;

  return (
    <div className="h-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">分項進度</h1>
              <p className="text-sm text-slate-500 mt-1">管理與追蹤您的任務執行狀況</p>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="搜尋任務名稱..."
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                新增任務
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6 w-24">
                      WBS
                    </th>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">
                      任務名稱
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                      狀態
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                      成本
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                      預定開始
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                      實際開始
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                      預定完成
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                      實際完成
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {flattenedTasks.length > 0 ? (
                    flattenedTasks.map((task) => {
                      const displayDates = getTaskDisplayDates(task);
                      const hasChildTasks = tasks.some(t => t.parentId === task.id);
                      return (
                      <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-500 sm:pl-6">
                          {task.wbs}
                        </td>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900">
                          <div style={{ paddingLeft: `${task.level * 1.5}rem` }} className="flex items-center">
                            {task.name}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(displayDates as Task)}`}>
                            {getStatusText(displayDates as Task)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900">
                          ${getTaskCost(task.id).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {displayDates.plannedStartDate || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {displayDates.actualStartDate || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {displayDates.plannedEndDate || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                            {displayDates.actualEndDate || '-'}
                          </div>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleMoveTask(task, 'up')}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                              title="往上移"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleMoveTask(task, 'down')}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                              title="往下移"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                            {task.level < 3 && (
                              <button
                                onClick={() => handleOpenModal(undefined, task)}
                                className="text-emerald-600 hover:text-emerald-900 p-1 rounded hover:bg-emerald-50 transition-colors"
                                title="新增子任務"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => !hasChildTasks && handleOpenCostModal(task)}
                              disabled={hasChildTasks}
                              className={`p-1 rounded transition-colors ${hasChildTasks ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'}`}
                              title={hasChildTasks ? "父項目無法直接設定成本，請由子項目設定" : "設定成本項目"}
                            >
                              <span className="text-xs font-bold px-1">成本</span>
                            </button>
                            <button
                              onClick={() => handleOpenModal(task)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                              title="編輯"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTaskRequest(task.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                              title="刪除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <AlertCircle className="h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-sm">找不到符合的任務</p>
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
            {/* Background overlay */}
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={handleCloseModal}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            {/* Modal panel */}
            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <form onSubmit={handleSaveTask}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg leading-6 font-semibold text-slate-900" id="modal-title">
                      {editingTask ? '編輯任務' : parentTaskForNew ? `新增子任務 (上層: ${parentTaskForNew.name})` : '新增任務'}
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
                  
                  <div className="space-y-4">
                    <div>
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
                        placeholder="輸入任務名稱"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="scheduledStart" className="block text-sm font-medium text-slate-700">
                          預定開始時間 {hasChildren && <span className="text-xs text-slate-500 font-normal">(由子任務自動計算)</span>}
                        </label>
                        <input
                          type="date"
                          name="scheduledStart"
                          id="scheduledStart"
                          disabled={hasChildren}
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          value={formData.plannedStartDate}
                          onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="actualStart" className="block text-sm font-medium text-slate-700">
                          實際開始時間 {hasChildren && <span className="text-xs text-slate-500 font-normal">(由子任務自動計算)</span>}
                        </label>
                        <input
                          type="date"
                          name="actualStart"
                          id="actualStart"
                          disabled={hasChildren}
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          value={formData.actualStartDate}
                          onChange={(e) => setFormData({ ...formData, actualStartDate: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="scheduledEnd" className="block text-sm font-medium text-slate-700">
                          預定完成時間 {hasChildren && <span className="text-xs text-slate-500 font-normal">(由子任務自動計算)</span>}
                        </label>
                        <input
                          type="date"
                          name="scheduledEnd"
                          id="scheduledEnd"
                          disabled={hasChildren}
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          value={formData.plannedEndDate}
                          onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="actualEnd" className="block text-sm font-medium text-slate-700">
                          實際完成時間 {hasChildren && <span className="text-xs text-slate-500 font-normal">(由子任務自動計算)</span>}
                        </label>
                        <input
                          type="date"
                          name="actualEnd"
                          id="actualEnd"
                          disabled={hasChildren}
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-slate-100 disabled:text-slate-500"
                          value={formData.actualEndDate}
                          onChange={(e) => setFormData({ ...formData, actualEndDate: e.target.value })}
                        />
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
      {/* Cost Assignment Modal */}
      {isCostModalOpen && selectedTaskForCost && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="cost-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={handleCloseCostModal}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
              <form onSubmit={handleSaveCostItems}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg leading-6 font-semibold text-slate-900" id="cost-modal-title">
                      設定成本項目 - {selectedTaskForCost.name}
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseCostModal}
                      className="bg-white rounded-md text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <span className="sr-only">關閉</span>
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <p className="text-sm text-slate-500 mb-2">請勾選要關聯至此任務的成本項目（已被其他任務使用的項目無法勾選）：</p>
                    <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
                      {costItems.length > 0 ? (
                        costItems.map(item => {
                          const isAssignedToOther = item.subItemId && item.subItemId !== selectedTaskForCost.id;
                          return (
                            <label key={item.id} className={`flex items-start p-3 ${isAssignedToOther ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50 cursor-pointer'}`}>
                              <div className="flex items-center h-5">
                                <input
                                  type="checkbox"
                                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300 rounded disabled:opacity-50"
                                  checked={selectedCostItemIds.has(item.id)}
                                  disabled={Boolean(isAssignedToOther)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedCostItemIds);
                                    if (e.target.checked) {
                                      newSet.add(item.id);
                                    } else {
                                      newSet.delete(item.id);
                                    }
                                    setSelectedCostItemIds(newSet);
                                  }}
                                />
                              </div>
                              <div className="ml-3 text-sm">
                                <span className="font-medium text-slate-900">{item.itemNumber} {item.name}</span>
                                {isAssignedToOther && (
                                  <span className="ml-2 text-xs text-red-500">(已指派給其他任務)</span>
                                )}
                              </div>
                            </label>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-sm text-slate-500">
                          目前沒有成本項目
                        </div>
                      )}
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
                    onClick={handleCloseCostModal}
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
      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setAlertMessage(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border border-slate-200">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-slate-900" id="modal-title">
                      提示
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-500">
                        {alertMessage}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAlertMessage(null)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setTaskToDelete(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border border-slate-200">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-slate-900" id="modal-title">
                      確認刪除
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-500">
                        確定要刪除此任務嗎？此操作無法復原。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200">
                <button
                  type="button"
                  onClick={confirmDeleteTask}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  刪除
                </button>
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
