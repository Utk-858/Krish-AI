
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Farm } from '@/lib/types';
import { VoiceInput } from './VoiceInput';
import { useEffect } from 'react';

const farmSchema = z.object({
  name: z.string().min(3, 'Farm name must be at least 3 characters'),
  location: z.string().min(2, 'Location is required'),
  size: z.coerce.number().positive('Size must be a positive number'),
  sizeUnit: z.enum(['acres', 'hectares']),
  mainCrop: z.string().min(2, 'Main crop is required'),
  soilType: z.string().optional(),
  irrigation: z.string().optional(),
});

type FarmFormData = Omit<Farm, 'id' | 'userId'>;

interface FarmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (farm: FarmFormData, id?: string) => void;
  farm?: Farm | null;
}

export default function FarmDialog({ isOpen, onClose, onSave, farm }: FarmDialogProps) {
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
    watch,
    setValue
  } = useForm<FarmFormData>({
    resolver: zodResolver(farmSchema),
  });

  useEffect(() => {
    if (farm) {
      reset({
        name: farm.name,
        location: farm.location,
        size: farm.size,
        sizeUnit: farm.sizeUnit,
        mainCrop: farm.mainCrop,
        soilType: farm.soilType,
        irrigation: farm.irrigation,
      });
    } else {
      reset({
        name: '',
        location: '',
        size: 0,
        sizeUnit: 'acres',
        mainCrop: '',
        soilType: '',
        irrigation: '',
      });
    }
  }, [farm, reset, isOpen]);

  const watchedValues = watch();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const onSubmit = (data: FarmFormData) => {
    onSave(data, farm?.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{farm ? 'Edit Farm' : 'Add New Farm'}</DialogTitle>
          <DialogDescription>
            {farm ? 'Update the details for your farm.' : 'Enter the details for your new farm.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Farm Name</Label>
            <VoiceInput
              value={watchedValues.name}
              onValueChange={(val) => setValue('name', val, { shouldDirty: true })}
              fieldName="Farm Name"
            >
              <Input id="name" {...register('name')} />
            </VoiceInput>
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <VoiceInput
              value={watchedValues.location}
              onValueChange={(val) => setValue('location', val, { shouldDirty: true })}
              fieldName="Location"
            >
              <Input id="location" {...register('location')} />
            </VoiceInput>
            {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="size">Farm Size</Label>
              <VoiceInput
                 value={String(watchedValues.size)}
                 onValueChange={(val) => setValue('size', Number(val) || 0, { shouldDirty: true })}
                 fieldName="Farm Size"
              >
                <Input id="size" type="number" step="0.1" {...register('size')} />
              </VoiceInput>
            </div>
            <div className="space-y-2">
                <Label htmlFor="sizeUnit">Unit</Label>
                <Controller
                    name="sizeUnit"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={(value) => { field.onChange(value); setValue('sizeUnit', value, { shouldDirty: true }) }} value={field.value}>
                            <SelectTrigger id="sizeUnit" className="h-10 mt-2">
                                <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="acres">Acres</SelectItem>
                                <SelectItem value="hectares">Hectares</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
          </div>
            {errors.size && <p className="text-sm text-destructive col-span-3">{errors.size.message}</p>}

          <div className="space-y-2">
            <Label htmlFor="mainCrop">Main Crop</Label>
             <VoiceInput
              value={watchedValues.mainCrop}
              onValueChange={(val) => setValue('mainCrop', val, { shouldDirty: true })}
              fieldName="Main Crop"
            >
                <Input id="mainCrop" {...register('mainCrop')} />
            </VoiceInput>
            {errors.mainCrop && <p className="text-sm text-destructive">{errors.mainCrop.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="soilType">Soil Type</Label>
             <VoiceInput
              value={watchedValues.soilType || ''}
              onValueChange={(val) => setValue('soilType', val, { shouldDirty: true })}
              fieldName="Soil Type"
            >
                <Input id="soilType" {...register('soilType')} placeholder="e.g. Loamy, Sandy" />
            </VoiceInput>
            {errors.soilType && <p className="text-sm text-destructive">{errors.soilType.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="irrigation">Irrigation</Label>
             <VoiceInput
              value={watchedValues.irrigation || ''}
              onValueChange={(val) => setValue('irrigation', val, { shouldDirty: true })}
              fieldName="Irrigation"
            >
                <Input id="irrigation" {...register('irrigation')} placeholder="e.g. Drip, Sprinkler" />
            </VoiceInput>
            {errors.irrigation && <p className="text-sm text-destructive">{errors.irrigation.message}</p>}
          </div>


          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Farm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
