import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthBootstrap } from '@/hooks/useAuth';
import { ChatPage } from '@/pages/ChatPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ProtectedRoute } from '@/router/ProtectedRoute';

export default function App() {
  useAuthBootstrap();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
