import { BasePage } from "@/components";
import { MainApp } from "@/features/app";
import WithAuth from "@/features/auth/WithAuth";

const MainPage = () => {
  return (
    <WithAuth>
      <BasePage>
        <MainApp />
      </BasePage>
    </WithAuth>
  );
};

export default MainPage;
