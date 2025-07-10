import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders user management heading", () => {
  render(<App />);
  const headingElement = screen.getByText(/user management/i);
  expect(headingElement).toBeInTheDocument();
});
