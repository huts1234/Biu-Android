import { Route, Routes } from "react-router";

import { DiscoverPage } from "./pages/DiscoverPage";
import { FolderPage } from "./pages/FolderPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LaterPage } from "./pages/LaterPage";
import { LibraryPage } from "./pages/LibraryPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<DiscoverPage />} path="/" />
      <Route element={<SearchPage />} path="/search" />
      <Route element={<LibraryPage />} path="/library" />
      <Route element={<FolderPage />} path="/folder/:id" />
      <Route element={<HistoryPage />} path="/history" />
      <Route element={<LaterPage />} path="/later" />
      <Route element={<SettingsPage />} path="/settings" />
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
