import { ImageResponse } from "next/og";

export const alt = "Somos Huella — volver a encontrar a quien falta";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "#efe9dc",
          color: "#221f1a",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#8c8470",
            marginBottom: 24,
          }}
        >
          Somos Huella
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 500,
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          Volver a encontrar a quien falta.
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: "#5f5848",
            maxWidth: 720,
            lineHeight: 1.4,
          }}
        >
          Cada huella nos acerca a casa.
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "#9a3b1b",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
