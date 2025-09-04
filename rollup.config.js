import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const extensions = [".ts", ".js"];

const preventTreeShakingPlugin = () => {
  return {
    name: "no-treeshaking",
    resolveId(id, importer) {
      if (!importer) {
        // let's not treeshake entry points, as we're not exporting anything in Api
        return { id, moduleSideEffects: "no-treeshake" };
      }
      return null;
    },
  };
};

export default {
  input: "./src/main.ts",
  output: {
    dir: "dist",
    format: "esm",
  },
  plugins: [
    preventTreeShakingPlugin(),
    nodeResolve({
      extensions,
      mainFields: ["jsnext:main", "index."],
    }),
    babel({ extensions, babelHelpers: "runtime" }),
  ],
};
