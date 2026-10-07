"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check, PenTool, RotateCcw } from "lucide-react";

interface SignaturePadProps {
  value?: string;
  onChange: (signatureDataUrl: string) => void;
  width?: number;
  height?: number;
}

export function SignaturePad({ value, onChange, width = 500, height = 180 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Initialize canvas stroke styles
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#10B981"; // Emerald green ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Load existing signature image if present
  useEffect(() => {
    if (value && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, [value]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas && !isEmpty) {
        onChange(canvas.toDataURL("image/png"));
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
          <PenTool className="h-3.5 w-3.5 text-emerald-400" />
          Area Tanda Tangan Virtual (TTD)
        </label>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-surface-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-surface-800"
        >
          <RotateCcw className="h-3 w-3" />
          Hapus TTD
        </button>
      </div>

      <div className="relative border border-surface-700 bg-surface-950 rounded-xl overflow-hidden touch-none group">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-44 cursor-crosshair bg-surface-950/80"
        />

        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-surface-600 text-xs gap-2 select-none">
            <PenTool className="h-4 w-4 opacity-50" />
            Coret / Tanda tangan di sini menggunakan jari atau mouse
          </div>
        )}

        <div className="absolute bottom-2 right-2 pointer-events-none text-[10px] text-surface-600 font-mono">
          Virtual Signature Pad
        </div>
      </div>
    </div>
  );
}
