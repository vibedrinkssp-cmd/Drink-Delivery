import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/react/dashboard";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  onUploadStart?: () => void;
  onError?: (error: Error) => void;
  buttonClassName?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  children: ReactNode;
  disabled?: boolean;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  onUploadStart,
  onError,
  buttonClassName,
  buttonVariant = "outline",
  buttonSize = "default",
  children,
  disabled = false,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: allowedFileTypes,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("upload", () => {
        onUploadStart?.();
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false);
      })
      .on("error", (error) => {
        onError?.(error);
        setShowModal(false);
      })
      .on("upload-error", (_file, error) => {
        onError?.(error);
      })
  );

  useEffect(() => {
    return () => {
      uppy.destroy();
    };
  }, [uppy]);

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        variant={buttonVariant}
        size={buttonSize}
        disabled={disabled}
        type="button"
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <Dashboard
            uppy={uppy}
            proudlyDisplayPoweredByUppy={false}
            height={350}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
