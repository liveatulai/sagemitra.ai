import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage, Circle } from "fabric";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw, Move, Check, X, FlipHorizontal } from "lucide-react";

interface ImageCropperProps {
  imageUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedImageDataUrl: string) => void;
}

export default function ImageCropper({ imageUrl, open, onOpenChange, onCropComplete }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [imageObj, setImageObj] = useState<FabricImage | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const CANVAS_SIZE = 300;
  const CIRCLE_RADIUS = 140;

  // Initialize canvas
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: "#1a1a1a",
      selection: false,
    });

    // Add circular crop guide (visual only)
    const cropCircle = new Circle({
      left: CANVAS_SIZE / 2,
      top: CANVAS_SIZE / 2,
      radius: CIRCLE_RADIUS,
      fill: "transparent",
      stroke: "rgba(255,255,255,0.5)",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      originX: "center",
      originY: "center",
    });
    canvas.add(cropCircle);

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
      setFabricCanvas(null);
      setImageObj(null);
    };
  }, [open]);

  // Load image when canvas is ready
  useEffect(() => {
    if (!fabricCanvas || !imageUrl || !open) return;

    setIsLoading(true);

    // First load image via HTMLImageElement to handle CORS properly
    const loadImage = async () => {
      try {
        // Create an image element to load the image
        const htmlImg = new Image();
        htmlImg.crossOrigin = "anonymous";
        
        // Create a promise to wait for image load
        await new Promise<void>((resolve, reject) => {
          htmlImg.onload = () => resolve();
          htmlImg.onerror = () => reject(new Error("Failed to load image"));
          htmlImg.src = imageUrl;
        });

        // Convert to data URL using a temporary canvas to avoid CORS issues
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = htmlImg.naturalWidth || htmlImg.width;
        tempCanvas.height = htmlImg.naturalHeight || htmlImg.height;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) throw new Error("No canvas context");
        ctx.drawImage(htmlImg, 0, 0);
        const dataUrl = tempCanvas.toDataURL("image/png");

        // Now load from the data URL (no CORS issues)
        const img = await FabricImage.fromURL(dataUrl);
        
        if (!img || !fabricCanvas) {
          setIsLoading(false);
          return;
        }

        // Calculate scale to fit image nicely
        const maxDim = Math.max(img.width || 1, img.height || 1);
        const scale = (CANVAS_SIZE * 0.9) / maxDim;

        img.set({
          left: CANVAS_SIZE / 2,
          top: CANVAS_SIZE / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
          hasControls: false,
          hasBorders: false,
          lockRotation: true,
        });

        // Remove old image if exists
        const objects = fabricCanvas.getObjects();
        objects.forEach((obj) => {
          if (obj instanceof FabricImage) {
            fabricCanvas.remove(obj);
          }
        });

        // Store original scale for zoom reference
        (img as any).__originalScale = scale;

        // Add to canvas (behind the circle guide)
        fabricCanvas.insertAt(0, img);
        setImageObj(img);
        setZoom(100);
        setIsFlipped(false);
        setIsLoading(false);
        fabricCanvas.renderAll();
      } catch (err) {
        console.error("Failed to load image:", err);
        setIsLoading(false);
      }
    };

    loadImage();
  }, [fabricCanvas, imageUrl, open]);

  // Handle zoom changes
  useEffect(() => {
    if (!imageObj || !fabricCanvas) return;

    const originalScale = (imageObj as any).__originalScale || 1;
    const zoomScale = (originalScale / 100) * zoom;
    
    imageObj.set({
      scaleX: zoomScale,
      scaleY: zoomScale,
    });
    fabricCanvas.renderAll();
  }, [zoom, imageObj, fabricCanvas]);

  const handleZoomChange = useCallback((value: number[]) => {
    setZoom(value[0]);
  }, []);

  const handleReset = useCallback(() => {
    if (!imageObj || !fabricCanvas) return;
    
    imageObj.set({
      left: CANVAS_SIZE / 2,
      top: CANVAS_SIZE / 2,
      flipX: false,
    });
    setZoom(100);
    setIsFlipped(false);
    fabricCanvas.renderAll();
  }, [imageObj, fabricCanvas]);

  const handleFlip = useCallback(() => {
    if (!imageObj || !fabricCanvas) return;
    
    const newFlipped = !isFlipped;
    imageObj.set({ flipX: newFlipped });
    setIsFlipped(newFlipped);
    fabricCanvas.renderAll();
  }, [imageObj, fabricCanvas, isFlipped]);

  const handleCrop = useCallback(() => {
    if (!fabricCanvas || !imageObj) return;

    // Create a temporary canvas for cropping
    const tempCanvas = document.createElement("canvas");
    const size = CIRCLE_RADIUS * 2;
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    // Create circular clip
    ctx.beginPath();
    ctx.arc(CIRCLE_RADIUS, CIRCLE_RADIUS, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Get the fabric canvas as image and draw the center portion
    const dataUrl = fabricCanvas.toDataURL({
      multiplier: 1,
      format: "png",
      quality: 1,
    });

    // Load and draw
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const croppedDataUrl = tempCanvas.toDataURL("image/png");
      onCropComplete(croppedDataUrl);
      onOpenChange(false);
    };
    img.src = dataUrl;
  }, [fabricCanvas, imageObj, onCropComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="w-5 h-5" />
            Crop & Position Image
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Canvas container */}
          <div
            ref={containerRef}
            className="relative rounded-lg overflow-hidden border-2 border-border"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
          >
            <canvas ref={canvasRef} />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag the image to position it within the circle
          </p>

          {/* Zoom controls */}
          <div className="w-full flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={handleZoomChange}
              min={50}
              max={200}
              step={5}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground w-12 text-right">{zoom}%</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={handleFlip} title="Flip horizontally">
            <FlipHorizontal className="w-4 h-4 mr-2" />
            Flip
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleCrop} disabled={isLoading}>
            <Check className="w-4 h-4 mr-2" />
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
