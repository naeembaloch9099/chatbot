import "./index.css";
import { Routes, Route, Navigate } from "react-router-dom";
import ToastContainer from "./Components/ToastContainer";
import ChatPage from "./pages/ChatPage";
import LandingWithChat from "./pages/LandingWithChat";
import Login from "./Auth/Login";
import Signup from "./Auth/signup";

function ProtectedRoute({ children }) {
  const isAuth = localStorage.getItem("isAuthenticated") === "1";
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const isAuth = localStorage.getItem("isAuthenticated") === "1";

  return (
    <>
      <ToastContainer />
      {/* Dev demo removed — uploader is available from the chat input */}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            isAuth ? <Navigate to="/chat" replace /> : <LandingWithChat />
          }
        />
      </Routes>
    </>
  );
}
