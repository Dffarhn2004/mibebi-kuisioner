"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App } from "antd";
import idID from "antd/locale/id_ID";

const theme = {
  token: {
    colorPrimary: "#D83028",
    colorInfo: "#D83028",
    colorSuccess: "#16A34A",
    borderRadius: 10,
    fontFamily:
      "var(--font-geist-sans), 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Button: {
      controlHeight: 44,
      fontWeight: 600,
    },
    Card: {
      headerFontSize: 16,
    },
  },
};

export default function Providers({ children }) {
  return (
    <AntdRegistry>
      <ConfigProvider locale={idID} theme={theme}>
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
