/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  scheduledStart: string;
  actualStart: string;
  scheduledEnd: string;
  actualEnd: string;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('progress-tracker-tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: '1',
        name: '系統需求分析',
        scheduledStart: '2026-03-01',
        actualStart: '2026-03-02',
        scheduledEnd: '2026-03-10',
        actualEnd: '2026-03-11',
      },
      {
        id: '2',
        name: 'UI/UX 設計',
        scheduledStart: '2026-03-11',
        actualStart: '2026-03-12',
        scheduledEnd: '2026-03-20',
        actualEnd: '',
      },
      {
        id: '3',
        name: '前端開發',
        scheduledStart: '2026-03-21',
        actualStart: '',
        scheduledEnd: '2026-04-15',
        actualEnd: '',
      }
    ];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    name: '',
    scheduledStart: '',
    actualStart: '',
    scheduledEnd: '',
    actualEnd: '',
  });

  useEffect(() => {
    localStorage.setItem('progress-tracker-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        name: task.name,
        scheduledStart: task.scheduledStart,
        actualStart: task.actualStart,
        scheduledEnd: task.scheduledEnd,
        actualEnd: task.actualEnd,
      });
    } else {
      setEditingTask(null);
      setFormData({
        name: '',
        scheduledStart: '',
        actualStart: '',
        scheduledEnd: '',
        actualEnd: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...formData, id: t.id } : t));
    } else {
      const newTask: Task = {
        ...formData,
        id: Date.now().toString(),
      };
      setTasks([...tasks, newTask]);
    }
    handleCloseModal();
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('確定要刪除此任務嗎？')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const getStatusColor = (task: Task) => {
    if (task.actualEnd) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (task.actualStart) return 'bg-blue-100 text-blue-800 border-blue-200';
    
    // Check if overdue
    if (task.scheduledStart && new Date(task.scheduledStart) < new Date() && !task.actualStart) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getStatusText = (task: Task) => {
    if (task.actualEnd) return '已完成';
    if (task.actualStart) return '進行中';
    if (task.scheduledStart && new Date(task.scheduledStart) < new Date() && !task.actualStart) return '已延遲';
    return '未開始';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">專案進度追蹤表</h1>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">
                    任務名稱
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">
                    狀態
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
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6">
                        {task.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task)}`}>
                          {getStatusText(task)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {task.scheduledStart || '-'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {task.actualStart || '-'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {task.scheduledEnd || '-'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                          {task.actualEnd || '-'}
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenModal(task)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="編輯"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="刪除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
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
                      {editingTask ? '編輯任務' : '新增任務'}
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
                          預定開始時間
                        </label>
                        <input
                          type="date"
                          name="scheduledStart"
                          id="scheduledStart"
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.scheduledStart}
                          onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="actualStart" className="block text-sm font-medium text-slate-700">
                          實際開始時間
                        </label>
                        <input
                          type="date"
                          name="actualStart"
                          id="actualStart"
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.actualStart}
                          onChange={(e) => setFormData({ ...formData, actualStart: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="scheduledEnd" className="block text-sm font-medium text-slate-700">
                          預定完成時間
                        </label>
                        <input
                          type="date"
                          name="scheduledEnd"
                          id="scheduledEnd"
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.scheduledEnd}
                          onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="actualEnd" className="block text-sm font-medium text-slate-700">
                          實際完成時間
                        </label>
                        <input
                          type="date"
                          name="actualEnd"
                          id="actualEnd"
                          className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          value={formData.actualEnd}
                          onChange={(e) => setFormData({ ...formData, actualEnd: e.target.value })}
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
    </div>
  );
}
