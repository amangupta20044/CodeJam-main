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
          icon: ">",
          style: {
            background: "#18181b",
            color: "#f4f4f5",
            border: "1px solid #27272a",
            borderRadius: "0",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: "11px",
            letterSpacing: "0.04em",
          },
          success: {
            icon: ">",
            style: {
              border: "1px solid #27272a",
              color: "#f4f4f5",
            },
          },
          error: {
            icon: "!",
            style: {
              border: "1px solid #7f1d1d",
              color: "#fca5a5",
            },
          },
        }}
      />
    </AuthProvider>
  </BrowserRouter>,
);
