import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface CalendarHeaderProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onToday: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  testIdPrefix?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function CalendarHeader({
  currentMonth,
  currentYear,
  onMonthChange,
  onYearChange,
  onToday,
  onPrevMonth,
  onNextMonth,
  testIdPrefix = "calendar",
}: CalendarHeaderProps) {
  const currentYearNum = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYearNum - 2 + i);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevMonth}
        data-testid={`button-${testIdPrefix}-prev`}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <Select
        value={String(currentMonth)}
        onValueChange={(v) => onMonthChange(parseInt(v))}
      >
        <SelectTrigger className="w-[130px]" data-testid={`select-${testIdPrefix}-month`}>
          <SelectValue>{MONTHS[currentMonth]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((month, idx) => (
            <SelectItem key={idx} value={String(idx)}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(currentYear)}
        onValueChange={(v) => onYearChange(parseInt(v))}
      >
        <SelectTrigger className="w-[100px]" data-testid={`select-${testIdPrefix}-year`}>
          <SelectValue>{currentYear}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={onNextMonth}
        data-testid={`button-${testIdPrefix}-next`}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToday}
        data-testid={`button-${testIdPrefix}-today`}
      >
        Today
      </Button>
    </div>
  );
}

export function useCalendarNavigation(initialDate?: Date) {
  const now = initialDate || new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return {
    currentMonth,
    currentYear,
    setCurrentMonth,
    setCurrentYear,
    goToToday,
    goToPrevMonth,
    goToNextMonth,
  };
}
