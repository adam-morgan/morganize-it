import { BasePageContainer, MainApp } from "@/features/app";
import WithAuth from "@/features/auth/containers/WithAuth";

const MainPage = () => {
  return (
    <WithAuth>
      <BasePageContainer>
        <MainApp />
      </BasePageContainer>
    </WithAuth>
  );
};

export default MainPage;
