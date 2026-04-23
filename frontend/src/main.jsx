import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            "!bg-slate-800 !text-slate-100 !border !border-slate-700",
        }}
      />
    </AuthProvider>
  </BrowserRouter>,
);