import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  SchedulerConfig,
  ClassPreview,
  DayTimePair,
  DAY_NAMES_FULL,
  generateClassesFromConfig,
} from "@/lib/scheduler";

interface SessionSchedulerProps {
  config: SchedulerConfig;
  onConfigChange: (config: SchedulerConfig) => void;
  previewClasses: ClassPreview[];
  onPreviewGenerate: (classes: ClassPreview[]) => void;
  title?: string;
  showLocation?: boolean;
  testIdPrefix?: string;
}

export function SessionScheduler({
  config,
  onConfigChange,
  previewClasses,
  onPreviewGenerate,
  title = "Class Schedule",
  showLocation = true,
  testIdPrefix = "scheduler",
}: SessionSchedulerProps) {

  // Auto-generate classes whenever config changes
  useEffect(() => {
    if (config.startDate && config.endDate && config.dayTimes.length > 0) {
      const allTimesValid = config.dayTimes.every(dt => dt.startTime && dt.endTime);
      if (allTimesValid) {
        const classes = generateClassesFromConfig(config);
        onPreviewGenerate(classes);
      } else {
        onPreviewGenerate([]);
      }
    } else {
      onPreviewGenerate([]);
    }
  }, [config.startDate, config.endDate, config.dayTimes, config.location, config.locationDetails]);

  const addDayTime = () => {
    const usedDays = config.dayTimes.map(dt => dt.dayOfWeek);
    const nextDay = [1, 2, 3, 4, 5, 0, 6].find(d => !usedDays.includes(d)) ?? 1;
    const lastTime = config.dayTimes[config.dayTimes.length - 1];
    onConfigChange({
      ...config,
      dayTimes: [
        ...config.dayTimes,
        { 
          dayOfWeek: nextDay, 
          startTime: lastTime?.startTime || "10:00", 
          endTime: lastTime?.endTime || "11:30" 
        }
      ]
    });
  };

  const removeDayTime = (index: number) => {
    if (config.dayTimes.length > 1) {
      const newDayTimes = config.dayTimes.filter((_, i) => i !== index);
      onConfigChange({ ...config, dayTimes: newDayTimes });
    }
  };

  const updateDayTime = (index: number, field: keyof DayTimePair, value: string | number) => {
    const newDayTimes = [...config.dayTimes];
    newDayTimes[index] = { ...newDayTimes[index], [field]: value };
    onConfigChange({ ...config, dayTimes: newDayTimes });
  };

  const usedDays = config.dayTimes.map(dt => dt.dayOfWeek);
  const canAddMore = usedDays.length < 7;
  
  // Validation checks
  const missingStartDate = !config.startDate;
  const missingEndDate = !config.endDate;
  const missingTimes = config.dayTimes.some(dt => !dt.startTime || !dt.endTime);
  const hasValidationErrors = missingStartDate || missingEndDate || missingTimes;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-stone-50">
      <Label className="text-base font-medium">{title}</Label>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className={`text-xs ${missingStartDate ? "text-red-600" : ""}`}>
            Start Date {missingStartDate && <span className="text-red-500">*</span>}
          </Label>
          <Input
            type="date"
            value={config.startDate}
            onChange={(e) => onConfigChange({ ...config, startDate: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            data-testid={`input-${testIdPrefix}-start-date`}
            className={missingStartDate ? "border-red-300 focus:border-red-500" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label className={`text-xs ${missingEndDate ? "text-red-600" : ""}`}>
            End Date {missingEndDate && <span className="text-red-500">*</span>}
          </Label>
          <Input
            type="date"
            value={config.endDate}
            onChange={(e) => onConfigChange({ ...config, endDate: e.target.value })}
            min={config.startDate || new Date().toISOString().split('T')[0]}
            data-testid={`input-${testIdPrefix}-end-date`}
            className={missingEndDate ? "border-red-300 focus:border-red-500" : ""}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs">Meeting Days & Times</Label>
        <div className="space-y-2">
          {config.dayTimes.map((dt, index) => (
            <div key={index} className="flex items-center gap-2 bg-white border rounded-lg p-2">
              <Select 
                value={String(dt.dayOfWeek)} 
                onValueChange={(v) => updateDayTime(index, 'dayOfWeek', parseInt(v))}
              >
                <SelectTrigger className="w-32" data-testid={`select-${testIdPrefix}-day-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES_FULL.map((day, dayIndex) => (
                    <SelectItem 
                      key={dayIndex} 
                      value={String(dayIndex)}
                      disabled={usedDays.includes(dayIndex) && dt.dayOfWeek !== dayIndex}
                    >
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="time"
                value={dt.startTime}
                onChange={(e) => updateDayTime(index, 'startTime', e.target.value)}
                className="w-28"
                data-testid={`input-${testIdPrefix}-start-time-${index}`}
              />
              <span className="text-stone-400">to</span>
              <Input
                type="time"
                value={dt.endTime}
                onChange={(e) => updateDayTime(index, 'endTime', e.target.value)}
                className="w-28"
                data-testid={`input-${testIdPrefix}-end-time-${index}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeDayTime(index)}
                disabled={config.dayTimes.length === 1}
                className="text-stone-400 hover:text-red-500"
                data-testid={`button-${testIdPrefix}-remove-day-${index}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDayTime}
            className="w-full"
            data-testid={`button-${testIdPrefix}-add-day`}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Another Day
          </Button>
        )}
      </div>

      {showLocation && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Address (optional)</Label>
            <Input
              placeholder="e.g., 1400 Sullivan Rd, Park City, UT 84060"
              value={config.location}
              onChange={(e) => onConfigChange({ ...config, location: e.target.value })}
              data-testid={`input-${testIdPrefix}-location`}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Location Details (optional)</Label>
            <Input
              placeholder="e.g., Near playground and volleyball nets"
              value={config.locationDetails}
              onChange={(e) => onConfigChange({ ...config, locationDetails: e.target.value })}
              data-testid={`input-${testIdPrefix}-location-details`}
            />
            <p className="text-xs text-stone-500">Add directions or notes to help people find the exact spot</p>
          </div>
        </div>
      )}

      {hasValidationErrors && (
        <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
          <p className="text-sm font-medium text-amber-700 mb-1">
            Complete these fields to generate classes:
          </p>
          <ul className="text-xs text-amber-600 list-disc list-inside space-y-0.5">
            {missingStartDate && <li>Start date is required</li>}
            {missingEndDate && <li>End date is required</li>}
            {missingTimes && <li>All meeting times must be filled in</li>}
          </ul>
        </div>
      )}

      {previewClasses.length > 0 && (
        <div className="border rounded-lg p-3 bg-white">
          <p className="text-sm font-medium text-green-700 mb-2">
            {previewClasses.length} classes will be created
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto text-sm">
            {previewClasses.map((cls, index) => (
              <div key={index} className="flex justify-between py-1 border-b border-stone-100 last:border-0">
                <span>
                  {new Date(cls.date).toLocaleDateString(undefined, { 
                    weekday: 'short', month: 'short', day: 'numeric' 
                  })}
                </span>
                <span className="text-stone-500">
                  {cls.startTime} - {cls.endTime}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewClasses.length === 0 && !hasValidationErrors && (
        <p className="text-xs text-stone-500 text-center py-2">
          No classes match the selected days in this date range
        </p>
      )}
    </div>
  );
}
