import { Routes, Route, Navigate } from "react-router-dom";
import Nav from "./components/nav.jsx";
import { Layout } from "../../components/layout.jsx";
import CustomBreadDatabase from "./components/customBreadCrumbs.jsx";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import ViewDatabase from "./ViewDatabase.jsx";

export default function Database() {
  const userRole = useSelector((state) => state.user.role);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (userRole !== undefined && userRole !== null) {
      setIsLoaded(true);
    }
  }, [userRole]);

  if (!isLoaded) return null;

  const defaultRedirectPath = () => {
    switch (userRole) {
      case "acadadmin":
        return "/database/view";
      default:
        return "/database/view";
    }
  };

  return (
    <div>
      <Layout>
        <CustomBreadDatabase />
        <Nav />
        <Routes>
          <Route
            path="/"
            element={<Navigate to={defaultRedirectPath()} replace />}
          />
          <Route path="/view" element={<ViewDatabase />} />
        </Routes>
      </Layout>
    </div>
  );
}
