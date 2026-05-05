import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function vendorChunkName(id: string): string | undefined {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
    return "react-vendor";
  }

  if (id.includes("/@ant-design/icons/")) {
    return "antd-icons";
  }

  if (id.includes("/@ant-design/cssinjs/") || id.includes("/@ant-design/cssinjs-utils/") || id.includes("/@ant-design/colors/") || id.includes("/@ant-design/fast-color/")) {
    return "antd-style";
  }

  if (id.includes("/antd/") || id.includes("/@ant-design/") || id.includes("/rc-") || id.includes("/@rc-component/")) {
    if (
      id.includes("/table/")
      || id.includes("/pagination/")
      || id.includes("/virtual-list/")
      || id.includes("/tree/")
      || id.includes("/select/")
      || id.includes("/cascader/")
      || id.includes("/tree-select/")
    ) {
      return "antd-data";
    }

    if (
      id.includes("/form/")
      || id.includes("/input/")
      || id.includes("/textarea/")
      || id.includes("/dialog/")
      || id.includes("/drawer/")
      || id.includes("/notification/")
      || id.includes("/steps/")
      || id.includes("/progress/")
      || id.includes("/tooltip/")
      || id.includes("/dropdown/")
      || id.includes("/menu/")
      || id.includes("/trigger/")
      || id.includes("/resize-observer/")
      || id.includes("/motion/")
      || id.includes("/overflow/")
    ) {
      return "antd-form";
    }

    return "antd-core";
  }

  return "vendor";
}

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: vendorChunkName,
      },
    },
  },
});
