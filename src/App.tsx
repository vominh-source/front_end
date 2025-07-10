import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import UserList from "./pages/UserList";
import UserEdit from "./pages/UserEdit";
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    min-height: 100vh;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  #root {
    min-height: 100vh;
  }
`;

function App() {
  return (
    <>
      <GlobalStyle />
      <Router>
        <div style={{ minHeight: "100vh", paddingBottom: "2rem" }}>
          <header
            style={{
              background: "white",
              padding: "1rem 0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                maxWidth: "1200px",
                margin: "0 auto",
                padding: "0 20px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <h1 style={{ color: "#333", margin: 0 }}>User Management</h1>
            </div>
          </header>

          <main>
            <Routes>
              {/* User management routes */}
              <Route path="/users" element={<UserList />} />
              <Route path="/users/:id/edit" element={<UserEdit />} />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/users" replace />} />
              <Route path="*" element={<Navigate to="/users" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </>
  );
}

export default App;
