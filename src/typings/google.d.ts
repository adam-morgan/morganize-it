declare namespace google.accounts.id {
  function initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }): void;
  function renderButton(
    element: HTMLElement,
    config: { theme?: string; size?: string; width?: string }
  ): void;
}
