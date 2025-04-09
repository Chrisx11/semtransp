import { ImageResponse } from "next/og"

// Route segment config
export const runtime = "edge"

// Image metadata
export const size = {
  width: 192,
  height: 192,
}
export const contentType = "image/png"

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "#2563eb",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "50%",
          fontWeight: "bold",
        }}
      >
        ST
      </div>
    ),
    {
      ...size,
      // Adicionando configurações adicionais para evitar o uso de resvg.wasm
      fonts: [],
      debug: false,
    }
  )
}

