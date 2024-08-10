import React, { useState, useRef, useCallback } from 'react';
import { FileImage, RotateCw, Upload } from 'lucide-react';
import { useSetRecoilState } from 'recoil';
import AvatarEditor from 'react-avatar-editor';
import { fileConfig as defaultFileConfig, mergeFileConfig } from 'librechat-data-provider';
import type { TUser } from 'librechat-data-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Slider } from '~/components/ui';
import { useUploadAvatarMutation, useGetFileConfig } from '~/data-provider';
import { useToastContext } from '~/Providers';
import { Spinner } from '~/components/svg';
import { cn, formatBytes } from '~/utils';
import { useLocalize } from '~/hooks';
import store from '~/store';

function Avatar() {
  const setUser = useSetRecoilState(store.user);
  const [image, setImage] = useState<string | File | null>(null);
  const [isDialogOpen, setDialogOpen] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const editorRef = useRef<AvatarEditor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: fileConfig = defaultFileConfig } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  const localize = useLocalize();
  const { showToast } = useToastContext();

  const { mutate: uploadAvatar, isLoading: isUploading } = useUploadAvatarMutation({
    onSuccess: (data) => {
      showToast({ message: localize('com_ui_upload_success') });
      setDialogOpen(false);
      setUser((prev) => ({ ...prev, avatar: data.url } as TUser));
    },
    onError: (error) => {
      console.error('Error:', error);
      showToast({ message: localize('com_ui_upload_error'), status: 'error' });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const handleFile = (file: File | undefined) => {
    if (fileConfig.avatarSizeLimit && file && file.size <= fileConfig.avatarSizeLimit) {
      setImage(file);
      setScale(1);
      setRotation(0);
    } else {
      const megabytes = fileConfig.avatarSizeLimit ? formatBytes(fileConfig.avatarSizeLimit) : 2;
      showToast({
        message: localize('com_ui_upload_invalid_var', megabytes + ''),
        status: 'error',
      });
    }
  };

  const handleScaleChange = (value: number[]) => {
    setScale(value[0]);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleUpload = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append('input', blob, 'avatar.png');
          formData.append('manual', 'true');
          uploadAvatar(formData);
        }
      }, 'image/png');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const resetImage = useCallback(() => {
    setImage(null);
    setScale(1);
    setRotation(0);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <span>{localize('com_nav_profile_picture')}</span>
        <button onClick={() => setDialogOpen(true)} className="btn btn-neutral relative">
          <FileImage className="mr-2 flex w-[22px] items-center stroke-1" />
          <span>{localize('com_nav_change_picture')}</span>
        </button>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetImage();
          }
        }}
      >
        <DialogContent
          className={cn('shadow-2xl dark:bg-gray-700 dark:text-white md:h-auto md:w-[450px]')}
          style={{ borderRadius: '12px' }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-medium leading-6 text-gray-800 dark:text-gray-200">
              {image ? localize('com_ui_preview') : localize('com_ui_upload_image')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center">
            {image ? (
              <>
                <div className="relative overflow-hidden rounded-full">
                  <AvatarEditor
                    ref={editorRef}
                    image={image}
                    width={250}
                    height={250}
                    border={0}
                    borderRadius={125}
                    color={[255, 255, 255, 0.6]}
                    scale={scale}
                    rotate={rotation}
                  />
                </div>
                <div className="mt-4 flex w-full flex-col items-center space-y-4">
                  <div className="flex w-full items-center justify-center space-x-4">
                    <span className="text-sm">Zoom:</span>
                    <Slider
                      value={[scale]}
                      min={1}
                      max={5}
                      step={0.001}
                      onValueChange={handleScaleChange}
                      className="w-2/3 max-w-xs"
                    />
                  </div>
                  <button
                    onClick={handleRotate}
                    className="rounded-full bg-gray-200 p-2 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500"
                  >
                    <RotateCw className="h-5 w-5" />
                  </button>
                </div>
                <button
                  className={cn(
                    'mt-4 flex items-center rounded px-4 py-2 text-white transition-colors hover:bg-green-600 hover:text-gray-200',
                    isUploading ? 'cursor-not-allowed bg-green-600' : 'bg-green-500',
                  )}
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Spinner className="icon-sm mr-2" />
                  ) : (
                    <Upload className="mr-2 h-5 w-5" />
                  )}
                  {localize('com_ui_upload')}
                </button>
              </>
            ) : (
              <div
                className="flex h-64 w-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <FileImage className="mb-4 h-12 w-12 text-gray-400" />
                <p className="mb-2 text-center text-sm text-gray-500 dark:text-gray-400">
                  {localize('com_ui_drag_drop')}
                </p>
                <button
                  onClick={openFileDialog}
                  className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  {localize('com_ui_select_file')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".png, .jpg, .jpeg"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Avatar;
