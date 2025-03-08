import { Suspense, JSX } from "react";
import { useRoutes } from "react-router-dom";
import routes from "~react-pages";

function App(): JSX.Element {
  return <Suspense>{useRoutes(routes)}</Suspense>;
}

export default App;
