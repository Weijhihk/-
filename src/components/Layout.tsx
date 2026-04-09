import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, Calendar, ListTodo, ChevronDown, ChevronRight, Menu, X, PieChart, FileText } from 'lucide-react';

export default function Layout() {
  const [isScheduleOpen, setIsScheduleOpen] = useState(true);
  const [isCostOpen, setIsCostOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isScheduleActive = location.pathname.includes('/schedule');
  const isCostActive = location.pathname.includes('/cost');

  const navContent = (
    <div className="mb-4">
      <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        專案管理
      </div>
      <div className="space-y-1">
        {/* Cost Management Collapsible */}
        <div className="pt-1">
          <button
            onClick={() => setIsCostOpen(!isCostOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors hover:bg-slate-800 hover:text-white ${
              isCostActive && !isCostOpen ? 'text-white' : 'text-slate-300'
            }`}
          >
            <div className="flex items-center">
              <DollarSign className="mr-3 h-5 w-5" />
              成本管理
            </div>
            {isCostOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          
          {isCostOpen && (
            <div className="mt-1 space-y-1 pl-11">
              <NavLink
                to="/cost/summary"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <PieChart className="mr-3 h-4 w-4" />
                成本總表
              </NavLink>
              <NavLink
                to="/cost/items"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <FileText className="mr-3 h-4 w-4" />
                成本項目管理
              </NavLink>
            </div>
          )}
        </div>

        {/* Schedule Management Collapsible */}
        <div className="pt-1">
          <button
            onClick={() => setIsScheduleOpen(!isScheduleOpen)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-colors hover:bg-slate-800 hover:text-white ${
              isScheduleActive && !isScheduleOpen ? 'text-white' : 'text-slate-300'
            }`}
          >
            <div className="flex items-center">
              <Calendar className="mr-3 h-5 w-5" />
              進度管理
            </div>
            {isScheduleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          
          {isScheduleOpen && (
            <div className="mt-1 space-y-1 pl-11">
              <NavLink
                to="/schedule/sub-items"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <ListTodo className="mr-3 h-4 w-4" />
                分項進度
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-slate-900 shadow-xl z-50">
            <div className="h-16 flex items-center justify-between px-6 bg-slate-950">
              <span className="text-white font-bold text-lg tracking-wider">專案管理系統</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 py-6 px-3 overflow-y-auto">
              {navContent}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 flex-shrink-0 shadow-xl z-20">
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800">
          <span className="text-white font-bold text-lg tracking-wider">專案管理系統</span>
        </div>
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          {navContent}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0 z-10">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-slate-500 hover:text-slate-700 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-4 font-bold text-slate-900">專案管理系統</span>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
