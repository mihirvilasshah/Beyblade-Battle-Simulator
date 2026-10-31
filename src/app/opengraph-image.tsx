import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/site";

export const alt = "BEYBLADE X Battle Arena — Simulate Epic Beyblade Battles";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "radial-gradient(circle at 75% 55%, #16324a 0%, #06070a 60%)",
          color: "#eef2f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", position: "absolute", right: 80, top: 115, width: 400, height: 400, borderRadius: 400, border: "6px solid #38d3f5", opacity: 0.6 }} />
        <div style={{ display: "flex", position: "absolute", right: 130, top: 165, width: 300, height: 300, borderRadius: 300, border: "3px dashed #ff7a2f", opacity: 0.6 }} />
        <div style={{ fontSize: 28, letterSpacing: 10, color: "#38d3f5", fontWeight: 700 }}>BEYBLADE X · BATTLE ARENA</div>
        <div style={{ fontSize: 108, fontWeight: 800, lineHeight: 1, marginTop: 24, letterSpacing: 2 }}>ENTER THE</div>
        <div style={{ fontSize: 108, fontWeight: 800, lineHeight: 1, color: "#ff8a3d", letterSpacing: 2 }}>BATTLE</div>
        <div style={{ fontSize: 30, marginTop: 36, maxWidth: 680, color: "#a3adbd" }}>{SITE_DESCRIPTION}</div>
      </div>
    ),
    size,
  );
}
