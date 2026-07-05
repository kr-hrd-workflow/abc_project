"use client";

import { useEffect, useMemo } from "react";
import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  SRGBColorSpace
} from "three";

import type { Vector3Tuple } from "./roadGeometry";

type CanvasTextPlaneProps = {
  text: string;
  size: [number, number];
  position?: Vector3Tuple;
  rotation?: Vector3Tuple;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontWeight?: number;
  opacity?: number;
  renderOrder?: number;
  userData?: Record<string, unknown>;
};
export type CanvasTextLayoutOptions = {
  maxFontSize: number;
  minFontSize: number;
  textureWidth: number;
  textureHeight: number;
  horizontalPadding: number;
  measureTextWidth: (line: string, fontSize: number) => number;
};
export type CanvasTextLayout = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  lineWidths: number[];
  maxTextWidth: number;
};

const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 512;
export const CANVAS_TEXT_CELL_WIDTH = TEXTURE_WIDTH;
export const CANVAS_TEXT_CELL_HEIGHT = TEXTURE_HEIGHT;
const KOREAN_FONT_STACK =
  "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";

export type CanvasTextCellOptions = {
  text: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  fontWeight: number;
};

// Draws one 1024x512 label cell with its top-left corner at (0, originY).
// Extracted from CanvasTextPlane so RoadDetailProps' label atlas can bake N
// labels into ONE shared texture with pixel-identical output to the
// individual-plane path (2026-07-04 draw-call reduction).
export function drawCanvasTextCell(
  context: CanvasRenderingContext2D,
  originY: number,
  { text, backgroundColor, borderColor, textColor, fontWeight }: CanvasTextCellOptions
) {
  const layout = getCanvasTextLayout(text, {
    horizontalPadding: 96,
    maxFontSize: 210,
    minFontSize: 72,
    textureHeight: TEXTURE_HEIGHT,
    textureWidth: TEXTURE_WIDTH,
    measureTextWidth: (line, fontSize) => {
      context.font = `${fontWeight} ${fontSize}px ${KOREAN_FONT_STACK}`;
      return context.measureText(line).width;
    }
  });

  context.save();
  context.translate(0, originY);

  context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  if (borderColor !== "rgba(255,255,255,0)") {
    context.strokeStyle = borderColor;
    context.lineWidth = 18;
    context.strokeRect(16, 16, TEXTURE_WIDTH - 32, TEXTURE_HEIGHT - 32);
  }

  const { fontSize, lineHeight, lines } = layout;
  const firstBaseline =
    TEXTURE_HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2;

  context.font = `${fontWeight} ${fontSize}px ${KOREAN_FONT_STACK}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(0,0,0,0.62)";
  context.lineWidth = 14;
  context.fillStyle = textColor;

  lines.forEach((line, index) => {
    const y = firstBaseline + index * lineHeight;
    context.strokeText(line, TEXTURE_WIDTH / 2, y);
    context.fillText(line, TEXTURE_WIDTH / 2, y);
  });

  context.restore();
}

export function CanvasTextPlane({
  text,
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  backgroundColor = "rgba(0,0,0,0)",
  borderColor = "rgba(255,255,255,0)",
  textColor = "#f6fbf5",
  fontWeight = 800,
  opacity = 1,
  renderOrder = 6,
  userData = {}
}: CanvasTextPlaneProps) {
  const texture = useMemo(() => {
    if (
      typeof document === "undefined" ||
      isJsdomRuntime() ||
      text.trim().length === 0
    ) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    const context = canvas.getContext("2d");

    if (!context) return null;

    drawCanvasTextCell(context, 0, {
      text,
      backgroundColor,
      borderColor,
      textColor,
      fontWeight
    });

    const nextTexture = new CanvasTexture(canvas);
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.anisotropy = 8;
    nextTexture.minFilter = LinearFilter;
    nextTexture.magFilter = LinearFilter;
    nextTexture.needsUpdate = true;

    return nextTexture;
  }, [backgroundColor, borderColor, fontWeight, text, textColor]);

  useEffect(
    () => () => {
      texture?.dispose();
    },
    [texture]
  );

  if (!texture) return null;

  return (
    <mesh
      position={position}
      renderOrder={renderOrder}
      rotation={rotation}
      userData={{
        ...userData,
        runtimeLabelRenderer: "canvas_texture",
        canvasText: text
      }}
    >
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={texture}
        opacity={opacity}
        side={DoubleSide}
        toneMapped={false}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

export function getCanvasTextLayout(
  text: string,
  options: CanvasTextLayoutOptions
): CanvasTextLayout {
  const explicitLines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sourceLines = explicitLines.length > 0 ? explicitLines : [text.trim()];
  const maxTextWidth = Math.max(1, options.textureWidth - options.horizontalPadding * 2);

  for (
    let fontSize = options.maxFontSize;
    fontSize >= options.minFontSize;
    fontSize -= 4
  ) {
    const lineHeight = fontSize * 1.02;
    const lines = sourceLines.flatMap((line) =>
      wrapCanvasTextLine(line, fontSize, maxTextWidth, options.measureTextWidth)
    );
    const lineWidths = lines.map((line) =>
      options.measureTextWidth(line, fontSize)
    );
    const fitsWidth = lineWidths.every((width) => width <= maxTextWidth);
    const fitsHeight = lines.length * lineHeight <= options.textureHeight * 0.78;

    if (fitsWidth && fitsHeight) {
      return {
        fontSize,
        lineHeight,
        lines,
        lineWidths,
        maxTextWidth
      };
    }
  }

  const fontSize = options.minFontSize;
  const lineHeight = fontSize * 1.02;
  const lines = sourceLines.flatMap((line) =>
    wrapCanvasTextLine(line, fontSize, maxTextWidth, options.measureTextWidth)
  );

  return {
    fontSize,
    lineHeight,
    lines,
    lineWidths: lines.map((line) => options.measureTextWidth(line, fontSize)),
    maxTextWidth
  };
}

function wrapCanvasTextLine(
  line: string,
  fontSize: number,
  maxTextWidth: number,
  measureTextWidth: (line: string, fontSize: number) => number
) {
  if (measureTextWidth(line, fontSize) <= maxTextWidth) return [line];

  const tokens = line.includes(" ") ? line.split(/\s+/).filter(Boolean) : [...line];
  const wrapped: string[] = [];
  let currentLine = "";

  for (const token of tokens) {
    const nextLine =
      currentLine.length === 0
        ? token
        : line.includes(" ")
          ? `${currentLine} ${token}`
          : `${currentLine}${token}`;

    if (
      currentLine.length > 0 &&
      measureTextWidth(nextLine, fontSize) > maxTextWidth
    ) {
      wrapped.push(currentLine);
      currentLine = token;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine.length > 0) wrapped.push(currentLine);

  return wrapped;
}

function isJsdomRuntime() {
  return (
    typeof window !== "undefined" &&
    /jsdom/i.test(window.navigator.userAgent)
  );
}
