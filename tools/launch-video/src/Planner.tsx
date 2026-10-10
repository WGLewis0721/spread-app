import { Img, staticFile } from "remotion";

// Actual web planner captures with isolated demonstration data. No product UI is fabricated.
export const Planner = ({ mode = "list" }: { mode?: "list" | "week" }) => (
  <div
    style={{
      width: 440,
      height: 990,
      borderRadius: 40,
      overflow: "hidden",
      background: "#F2F2F7",
    }}
  >
    <Img
      src={staticFile(`assets/product-${mode}.png`)}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  </div>
);
