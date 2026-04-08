import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

const LoadingSpinner = () => (
  <div className="flex h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const LoginPage = lazy(() => import("@/pages/login"));
const CreateAccountPage = lazy(() => import("@/pages/create-account"));
const MainPage = lazy(() => import("@/pages/index"));

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/*" element={<MainPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
