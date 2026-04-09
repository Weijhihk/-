/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import CostSummary from './pages/CostSummary';
import CostItemManagement from './pages/CostItemManagement';
import SubItemProgress from './pages/SubItemProgress';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/schedule/sub-items" replace />} />
          <Route path="cost">
            <Route index element={<Navigate to="summary" replace />} />
            <Route path="summary" element={<CostSummary />} />
            <Route path="items" element={<CostItemManagement />} />
          </Route>
          <Route path="schedule">
            <Route index element={<Navigate to="sub-items" replace />} />
            <Route path="sub-items" element={<SubItemProgress />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
