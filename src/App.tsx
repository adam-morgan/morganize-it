import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

const LoginPage = lazy(() => import("@/pages/login"));
const CreateAccountPage = lazy(() => import("@/pages/create-account"));
const MainPage = lazy(() => import("@/pages/index"));

function App() {
  return (
    <Suspense>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/*" element={<MainPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
